/**
 * Web Push dispatcher.
 *
 * `sendPush(userId, payload)` looks up every PushSubscription for the user
 * and fires an encrypted notification via web-push. Failed deliveries with
 * status 404/410 (subscription expired or revoked) get pruned automatically
 * so we don't keep retrying dead endpoints.
 *
 * Errors at every level are caught — push is best-effort, never blocks the
 * caller. If VAPID env vars aren't set, the function is a no-op (logs once).
 */
import webpush from "web-push";
import { prisma } from "@/lib/db";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

let configured = false;
let warned = false;

function configureOnce(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) {
    if (!warned) {
      console.warn(
        "[push] VAPID keys not set — push notifications disabled. Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY."
      );
      warned = true;
    }
    return false;
  }
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
  return true;
}

export async function sendPush(
  userId: string,
  payload: PushPayload
): Promise<{ delivered: number; pruned: number }> {
  if (!configureOnce()) return { delivered: 0, pruned: 0 };

  let delivered = 0;
  let pruned = 0;

  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return { delivered: 0, pruned: 0 };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/mascot-192.png",
      badge: payload.badge || "/mascot-96.png",
      url: payload.url || "/",
      tag: payload.tag,
      data: payload.data || {},
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body
          );
          delivered++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            // Expired/revoked — prune
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
            pruned++;
          } else {
            console.error(`[push] delivery to ${sub.id} failed:`, err);
          }
        }
      })
    );
  } catch (err) {
    console.error("[push] sendPush failed:", err);
  }

  return { delivered, pruned };
}

/** Convenience: derive payload from a Notification row. */
export function notificationToPushPayload(notif: {
  type: string;
  title: string;
  message: string;
  data: unknown;
}): PushPayload {
  const data = (notif.data || {}) as Record<string, unknown>;
  const link = (data.link as string | undefined) || pickUrl(notif.type, data);
  return {
    title: notif.title,
    body: notif.message,
    url: link || "/",
    tag: `${notif.type}-${(data.id as string) || Date.now()}`,
    data,
  };
}

function pickUrl(type: string, data: Record<string, unknown>): string {
  if (data.ticketId) return `/tickets`;
  if (data.dealId) return `/deals`;
  if (data.leadId) return `/funnel`;
  if (data.invoiceId) return `/invoices`;
  if (data.channelId) return `/?channel=${data.channelId}`;
  switch (type) {
    case "MENTION":
      return `/?channel=${data.channelId || ""}`;
    case "TICKET_ASSIGNED":
    case "TICKET_STATUS_CHANGED":
      return `/tickets`;
    case "DEAL_STAGE_CHANGED":
      return `/deals`;
    default:
      return `/`;
  }
}
