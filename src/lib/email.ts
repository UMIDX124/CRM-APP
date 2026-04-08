/**
 * Email dispatch via Resend.
 *
 * Resend SDK is already installed (`resend` 6.10.0). Setup requires:
 *   RESEND_API_KEY  — from resend.com dashboard
 *   EMAIL_FROM      — verified sender (e.g. crm@fu-corp.com)
 *
 * If env vars are missing this module logs once and becomes a no-op so the
 * caller never crashes. Email is best-effort fan-out, never blocking.
 */
import { Resend } from "resend";

let client: Resend | null = null;
let warned = false;

function getClient(): Resend | null {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warned) {
      console.warn(
        "[email] RESEND_API_KEY not set — email sending disabled (no-op)."
      );
      warned = true;
    }
    return null;
  }
  client = new Resend(apiKey);
  return client;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "Alpha Command Center <onboarding@resend.dev>";
}

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/** Low-level send. Returns true on success. */
export async function sendEmail(args: SendArgs): Promise<boolean> {
  try {
    const c = getClient();
    if (!c) return false;
    const result = await c.emails.send({
      from: getFromAddress(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (result.error) {
      console.error("[email] send failed:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", err);
    return false;
  }
}

/* ─── Templates ─────────────────────────────────────── */

function wrap(content: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fafafa;">
      <div style="background:#6366F1;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:18px;letter-spacing:-0.01em;">Alpha Command Center</h1>
      </div>
      <div style="padding:24px;background:#131318;border:1px solid rgba(255,255,255,0.06);border-top:none;border-radius:0 0 12px 12px;">
        ${content}
      </div>
    </div>
  `;
}

export function sendTicketStatusChange(
  to: string,
  ticket: { number: number; subject: string; status: string },
  appUrl: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `[#${ticket.number}] Status updated to ${ticket.status}`,
    html: wrap(`
      <p style="margin:0 0 12px;font-size:14px;">Your support ticket has been updated.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#71717a;">Ticket</td><td style="padding:6px 0;">#${ticket.number}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Subject</td><td style="padding:6px 0;">${escapeHtml(ticket.subject)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">New status</td><td style="padding:6px 0;font-weight:600;">${ticket.status}</td></tr>
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="${appUrl}/tickets" style="display:inline-block;padding:10px 24px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">View ticket</a>
      </div>
    `),
  });
}

export function sendCSATRequest(
  to: string,
  ticket: { number: number; subject: string },
  appUrl: string,
  token: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `How was your support experience? [#${ticket.number}]`,
    html: wrap(`
      <p style="margin:0 0 16px;font-size:14px;">Your ticket <strong>#${ticket.number}</strong> has been resolved. We&rsquo;d love to hear how we did.</p>
      <p style="margin:0 0 20px;font-size:13px;color:#a1a1aa;">${escapeHtml(ticket.subject)}</p>
      <div style="text-align:center;margin:24px 0;">
        ${[1, 2, 3, 4, 5]
          .map(
            (n) =>
              `<a href="${appUrl}/csat/${token}?score=${n}" style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background:#1e1e26;color:#fafafa;text-decoration:none;font-size:18px;margin:0 4px;border:1px solid rgba(255,255,255,0.08);">${n}</a>`
          )
          .join("")}
      </div>
      <p style="margin:0;font-size:11px;color:#71717a;text-align:center;">1 = Poor &middot; 5 = Excellent</p>
    `),
  });
}

export function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Reset your Alpha Command Center password",
    html: wrap(`
      <p style="margin:0 0 12px;font-size:14px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;font-size:14px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">Reset password</a>
      </div>
      <p style="margin:0;font-size:11px;color:#71717a;">If you didn&rsquo;t request this, you can safely ignore this email — your password will not change.</p>
    `),
  });
}

export function sendTicketAssignedToAgent(
  to: string,
  ticket: { number: number; subject: string; priority: string },
  appUrl: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `New ${ticket.priority} ticket assigned: #${ticket.number}`,
    html: wrap(`
      <p style="margin:0 0 12px;font-size:14px;">A new ticket has been assigned to you.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#71717a;">Ticket</td><td style="padding:6px 0;">#${ticket.number}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Subject</td><td style="padding:6px 0;">${escapeHtml(ticket.subject)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Priority</td><td style="padding:6px 0;font-weight:600;">${ticket.priority}</td></tr>
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="${appUrl}/tickets" style="display:inline-block;padding:10px 24px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">View ticket</a>
      </div>
    `),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
