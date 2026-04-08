import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/events
 *
 * Single SSE stream multiplexing notifications, chat messages, and presence
 * deltas for the authenticated user. Vercel Functions support streaming
 * Responses under Fluid Compute. The handler polls each table every 3s,
 * pushes deltas, sends a 25s heartbeat, and self-terminates at 4min so the
 * function instance recycles. Client EventSource auto-reconnects.
 *
 * Why polling: serverless functions are stateless. Indexed cursor queries
 * (<10ms each) give near-real-time UX with zero external infra.
 *
 * Events emitted:
 *   - connected     (one-shot, on stream open)
 *   - notification  (per new Notification row)
 *   - message       (per new Message row in user's channels)
 *   - presence      (when any user this user shares a channel with flips status)
 *   - reconnect     (server graceful close — client should reopen)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 25000;
const MAX_LIFETIME_MS = 4 * 60 * 1000;

function deriveStatus(lastSeenAt: Date | null): "online" | "away" | "offline" {
  if (!lastSeenAt) return "offline";
  const ms = Date.now() - lastSeenAt.getTime();
  if (ms < 60_000) return "online";
  if (ms < 5 * 60_000) return "away";
  return "offline";
}

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = user.id;

  const encoder = new TextEncoder();
  let notifCursor = new Date();
  let messageCursor = new Date();
  // Track the last presence status we sent per peer userId so we only
  // emit deltas, not every poll cycle.
  const presenceCache = new Map<string, "online" | "away" | "offline">();
  let cancelled = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let beatTimer: ReturnType<typeof setInterval> | undefined;
  let lifetimeTimer: ReturnType<typeof setTimeout> | undefined;

  // Channel IDs the user is a member of (refreshed periodically)
  let channelIds: string[] = [];
  let lastChannelRefresh = 0;
  async function refreshChannels(force = false) {
    const now = Date.now();
    if (!force && now - lastChannelRefresh < 30_000) return;
    lastChannelRefresh = now;
    try {
      const memberships = await prisma.channelMember.findMany({
        where: { userId },
        select: { channelId: true },
      });
      channelIds = memberships.map((m) => m.channelId);
    } catch (err) {
      console.error("[sse] channel refresh failed:", err);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed by client
        }
      };

      // Hello frame so the client knows the connection is live
      send("connected", { userId, timestamp: Date.now() });

      // Hydrate from initial data: notifications, latest messages, presence
      await refreshChannels(true);
      try {
        const recent = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        if (recent.length > 0) {
          for (const n of recent.reverse()) {
            send("notification", {
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              data: n.data,
              isRead: n.isRead,
              createdAt: n.createdAt,
            });
          }
          notifCursor = recent[recent.length - 1].createdAt;
        }
      } catch (err) {
        console.error("[sse] notification hydrate failed:", err);
      }

      // Heartbeat — comments are ignored by EventSource but keep proxies open
      beatTimer = setInterval(() => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // Stream closed
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Main poll loop — runs every POLL_INTERVAL_MS
      pollTimer = setInterval(async () => {
        if (cancelled) return;

        // Refresh channel membership periodically (cheap, every 30s)
        await refreshChannels();

        // ── 1) New notifications ──────────────────────────────
        try {
          const fresh = await prisma.notification.findMany({
            where: { userId, createdAt: { gt: notifCursor } },
            orderBy: { createdAt: "asc" },
            take: 25,
          });
          if (fresh.length > 0) {
            for (const n of fresh) {
              send("notification", {
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                data: n.data,
                isRead: n.isRead,
                createdAt: n.createdAt,
              });
            }
            notifCursor = fresh[fresh.length - 1].createdAt;
          }
        } catch (err) {
          console.error("[sse] notification poll failed:", err);
        }

        // ── 2) New messages in user's channels ────────────────
        if (channelIds.length > 0) {
          try {
            const fresh = await prisma.message.findMany({
              where: {
                channelId: { in: channelIds },
                createdAt: { gt: messageCursor },
                // Don't echo the user's own messages back via SSE — they
                // already have them locally from the optimistic POST.
                NOT: { authorId: userId },
              },
              orderBy: { createdAt: "asc" },
              take: 50,
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    role: true,
                  },
                },
              },
            });
            if (fresh.length > 0) {
              for (const m of fresh) {
                send("message", {
                  id: m.id,
                  channelId: m.channelId,
                  content: m.content,
                  type: m.type,
                  metadata: m.metadata,
                  createdAt: m.createdAt,
                  author: {
                    id: m.author.id,
                    name: `${m.author.firstName} ${m.author.lastName}`.trim(),
                    avatar: m.author.avatar,
                    role: m.author.role,
                  },
                });
              }
              messageCursor = fresh[fresh.length - 1].createdAt;
            }
          } catch (err) {
            console.error("[sse] message poll failed:", err);
          }
        }

        // ── 3) Presence deltas across peers in shared channels ──
        if (channelIds.length > 0) {
          try {
            const peers = await prisma.channelMember.findMany({
              where: { channelId: { in: channelIds } },
              select: {
                user: { select: { id: true, lastSeenAt: true } },
              },
              distinct: ["userId"],
            });
            for (const p of peers) {
              const peerId = p.user.id;
              if (peerId === userId) continue;
              const status = deriveStatus(p.user.lastSeenAt);
              if (presenceCache.get(peerId) !== status) {
                presenceCache.set(peerId, status);
                send("presence", {
                  userId: peerId,
                  status,
                  lastSeenAt: p.user.lastSeenAt,
                });
              }
            }
          } catch (err) {
            console.error("[sse] presence poll failed:", err);
          }
        }
      }, POLL_INTERVAL_MS);

      // Auto-terminate after MAX_LIFETIME_MS so functions recycle cleanly
      lifetimeTimer = setTimeout(() => {
        send("reconnect", { reason: "lifetime", after: MAX_LIFETIME_MS });
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      }, MAX_LIFETIME_MS);
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    cancelled = true;
    if (pollTimer) clearInterval(pollTimer);
    if (beatTimer) clearInterval(beatTimer);
    if (lifetimeTimer) clearTimeout(lifetimeTimer);
  }

  // If the client aborts, clean up immediately
  req.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
