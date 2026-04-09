import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { sanitizeText, clampLength } from "@/lib/sanitize";

const POST_LIMIT = { limit: 30, windowSec: 60 };
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Single source of truth for channel access + auto-join semantics.
 *
 *   - Channel missing            → { ok: false, reason: "not_found" }
 *   - Existing membership        → { ok: true  }
 *   - PUBLIC channel, new user   → auto-create ChannelMember row, { ok: true }
 *   - PRIVATE / DIRECT, non-member → { ok: false, reason: "not_member" }
 *
 * The auto-join path was added after a sprint audit found that the hard
 * membership check broke the common "walk into #general and type" flow
 * for brand-new users whose seed didn't enrol them in public rooms.
 * `upsert` keeps this race-safe when two concurrent requests hit a
 * brand-new public channel simultaneously.
 */
async function ensureChannelAccess(
  channelId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_member" }> {
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  if (existing) return { ok: true };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, type: true },
  });
  if (!channel) return { ok: false, reason: "not_found" };

  if (channel.type === "PUBLIC") {
    try {
      await prisma.channelMember.upsert({
        where: { channelId_userId: { channelId, userId } },
        update: {},
        create: { channelId, userId, role: "MEMBER" },
      });
      return { ok: true };
    } catch (err) {
      console.error(
        `[ensureChannelAccess] auto-join failed for user=${userId} channel=${channelId}:`,
        err
      );
      return { ok: false, reason: "not_member" };
    }
  }

  // PRIVATE / DIRECT — strict membership required
  return { ok: false, reason: "not_member" };
}

// GET /api/channels/:id/messages — fetch messages for a channel
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Membership check: only users who belong to the channel can read its
    // messages. For PUBLIC channels we auto-enrol any authenticated user
    // on first access (matches Slack / Discord "public room" semantics
    // where the whole workspace can walk into #general). For PRIVATE and
    // DIRECT channels the check is strict — non-members get 404 so the
    // endpoint doesn't leak which private channel IDs exist.
    const access = await ensureChannelAccess(id, user.id);
    if (!access.ok) {
      console.warn(
        `[messages GET] access denied for user=${user.id} channel=${id} reason=${access.reason}`
      );
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const messages = await prisma.message.findMany({
      where: { channelId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
        parent: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            author: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        reactions: {
          select: { emoji: true, userId: true },
        },
        pin: { select: { id: true } },
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json({
      messages: messages.reverse().map((m) => {
        // Group reactions client-friendly
        const reactionMap: Record<string, { count: number; reactedByMe: boolean }> = {};
        for (const r of m.reactions) {
          if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, reactedByMe: false };
          reactionMap[r.emoji].count += 1;
          if (r.userId === user.id) reactionMap[r.emoji].reactedByMe = true;
        }
        return {
          id: m.id,
          content: m.deletedAt ? "" : m.content,
          deletedAt: m.deletedAt,
          editedAt: m.editedAt,
          type: m.type,
          metadata: m.metadata,
          attachments: m.attachments,
          linkPreview: m.linkPreview,
          parentMessageId: m.parentMessageId,
          parent: m.parent && !m.parent.deletedAt
            ? {
                id: m.parent.id,
                content: m.parent.content,
                authorName: `${m.parent.author.firstName} ${m.parent.author.lastName}`.trim(),
              }
            : null,
          reactions: Object.entries(reactionMap).map(([emoji, v]) => ({
            emoji,
            count: v.count,
            reactedByMe: v.reactedByMe,
          })),
          isPinned: !!m.pin,
          replyCount: m._count.replies,
          createdAt: m.createdAt,
          author: {
            id: m.author.id,
            name: `${m.author.firstName} ${m.author.lastName}`.trim(),
            avatar: m.author.avatar,
            role: m.author.role,
          },
        };
      }),
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      "[messages GET] unhandled error:",
      JSON.stringify({ detail, stack })
    );
    return NextResponse.json(
      {
        error: "Failed to load messages",
        code: "MESSAGE_LOAD_FAILED",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 }
    );
  }
}

// POST /api/channels/:id/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limit on message posts
    const limited = await rateLimit("messages", req, POST_LIMIT, user.id);
    if (!limited.success) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Slow down a bit." },
        {
          status: 429,
          headers: rateLimitHeaders(limited, POST_LIMIT),
        }
      );
    }

    const { id } = await params;

    // Enforce the same access rule as GET: PUBLIC channels auto-enrol
    // the caller, PRIVATE / DIRECT channels reject non-members with 404.
    const access = await ensureChannelAccess(id, user.id);
    if (!access.ok) {
      console.warn(
        `[messages POST] access denied for user=${user.id} channel=${id} reason=${access.reason}`
      );
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content, type, metadata, parentMessageId, attachments } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Sanitize: strip HTML, clamp length
    const cleanContent = clampLength(sanitizeText(content), MAX_MESSAGE_LENGTH);
    if (cleanContent.length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Validate parent message belongs to same channel (if provided)
    if (parentMessageId && typeof parentMessageId === "string") {
      const parent = await prisma.message.findUnique({
        where: { id: parentMessageId },
        select: { channelId: true, deletedAt: true },
      });
      if (!parent || parent.channelId !== id || parent.deletedAt) {
        return NextResponse.json(
          { error: "Invalid parent message" },
          { status: 400 }
        );
      }
    }

    // Validate attachments shape (array of {url, name, mime, size})
    let cleanAttachments = null;
    if (Array.isArray(attachments) && attachments.length > 0) {
      cleanAttachments = attachments
        .filter(
          (a) =>
            a &&
            typeof a.url === "string" &&
            typeof a.name === "string" &&
            typeof a.mime === "string"
        )
        .slice(0, 10); // hard cap
    }

    const message = await prisma.message.create({
      data: {
        content: cleanContent,
        channelId: id,
        authorId: user.id,
        type: type || "TEXT",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        parentMessageId: parentMessageId || null,
        attachments: cleanAttachments ?? undefined,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    });

    // Handle @mentions — extract all unique names first, resolve them in
    // ONE findMany against the user table, then fan out notifications.
    // This replaces the previous N+1 pattern where each match inside the
    // regex loop triggered a separate findFirst. Hard cap of 20 distinct
    // mentions per message prevents pathological "@a @b @c @d @e @f @g..."
    // from building a huge OR clause.
    const mentionRegex = /@(\w+)/g;
    const mentionNames = new Set<string>();
    for (const m of cleanContent.matchAll(mentionRegex)) {
      const name = m[1].toLowerCase();
      if (name) mentionNames.add(name);
      if (mentionNames.size >= 20) break;
    }

    if (mentionNames.size > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          OR: Array.from(mentionNames).map((name) => ({
            firstName: { equals: name, mode: "insensitive" as const },
          })),
        },
        select: { id: true, firstName: true },
      });
      // Notifications are independent — fire them in parallel, swallowing
      // individual failures so one bad row doesn't block the others.
      await Promise.all(
        mentionedUsers
          .filter((u) => u.id !== user.id)
          .map((u) =>
            createNotification({
              type: "MENTION",
              title: "You were mentioned",
              message: `${user.firstName} mentioned you in #${channel.name}`,
              userId: u.id,
              data: { channelId: id, messageId: message.id, link: `/chat?channel=${id}` },
            }).catch((err) =>
              console.error("[messages POST] mention notify failed:", err)
            )
          )
      );
    }

    return NextResponse.json({
      id: message.id,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      createdAt: message.createdAt,
      author: {
        id: message.author.id,
        name: `${message.author.firstName} ${message.author.lastName}`.trim(),
        avatar: message.author.avatar,
        role: message.author.role,
      },
    }, { status: 201 });
  } catch (err) {
    // Structured logging so failures surface with context in the runtime
    // logs — prior "Failed to send" errors were opaque because the catch
    // swallowed the inner Prisma/validation message.
    const detail = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      "[messages POST] unhandled error:",
      JSON.stringify({ detail, stack })
    );
    return NextResponse.json(
      {
        error: "Failed to send message",
        code: "MESSAGE_SEND_FAILED",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 }
    );
  }
}
