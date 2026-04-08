import { prisma } from "./db";
import { sendPush, notificationToPushPayload } from "./push";

// ─── Notification Types ─────────────────────────────
export type NotificationType =
  | "LEAD_NEW"
  | "LEAD_ASSIGNED"
  | "LEAD_STATUS"
  | "CLIENT_ADDED"
  | "CLIENT_DELETED"
  | "CLIENT_HEALTH"
  | "INVOICE_PAID"
  | "INVOICE_OVERDUE"
  | "TASK_ASSIGNED"
  | "TASK_STATUS"
  | "TASK_DUE"
  | "TEAM_UPDATE"
  | "MENTION"
  | "TICKET_ASSIGNED"
  | "TICKET_STATUS_CHANGED"
  | "DEAL_STAGE_CHANGED"
  | "SLA_BREACH"
  | "SYSTEM";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  userId: string; // specific user, or "all" for broadcast
  data?: Record<string, unknown>; // { leadId, clientId, taskId, invoiceId, link }
}

// ─── Create a notification for a specific user ──────
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    let recipientIds: string[] = [];
    if (params.userId === "all") {
      const users = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
      await prisma.notification.createMany({
        data: recipientIds.map((uid) => ({
          type: params.type,
          title: params.title,
          message: params.message,
          userId: uid,
          data: params.data ? JSON.parse(JSON.stringify(params.data)) : undefined,
        })),
      });
    } else {
      await prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          message: params.message,
          userId: params.userId,
          data: params.data ? JSON.parse(JSON.stringify(params.data)) : undefined,
        },
      });
      recipientIds = [params.userId];
    }

    // Best-effort fan-out to web push subscribers (silent on failure).
    // Only fire push for "interesting" notification types — internal SYSTEM
    // updates and routine status changes shouldn't buzz everyone's phone.
    const pushable: NotificationType[] = [
      "MENTION",
      "TICKET_ASSIGNED",
      "DEAL_STAGE_CHANGED",
      "SLA_BREACH",
      "LEAD_NEW",
      "INVOICE_PAID",
    ];
    if (pushable.includes(params.type)) {
      const payload = notificationToPushPayload({
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
      });
      await Promise.allSettled(recipientIds.map((uid) => sendPush(uid, payload)));
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
    // Non-blocking — don't throw, just log
  }
}

// ─── Auto-post to a channel ─────────────────────────
export async function autoPostToChannel(
  channelName: string,
  content: string,
  authorId: string,
  type: string = "SYSTEM",
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const channel = await prisma.channel.findFirst({
      where: { name: channelName },
      select: { id: true },
    });
    if (!channel) return;

    await prisma.message.create({
      data: {
        content,
        channelId: channel.id,
        authorId,
        type,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (err) {
    console.error(`Failed to auto-post to #${channelName}:`, err);
  }
}

// ─── Helper: get a system user ID for auto-posts ────
export async function getSystemUserId(): Promise<string | null> {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    return admin?.id || null;
  } catch {
    return null;
  }
}
