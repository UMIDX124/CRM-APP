import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { rateLimit } from "@/lib/ratelimit";
import { sanitizeText, clampLength } from "@/lib/sanitize";
import { computeSlaDueAt, type TicketPriorityLike } from "@/lib/sla";

/**
 * POST /api/webhook/ticket
 *
 * Inbound support-ticket capture from the VCS / BSL / DPL marketing sites.
 * Mirrors the security posture of /api/webhook/lead:
 *   - CORS origin allow-list
 *   - HMAC-SHA256 signature verification via X-Webhook-Signature
 *     (`LEAD_WEBHOOK_SECRET`, same key the lead webhook uses — we reuse it
 *     rather than introduce a second signing secret the sites would also
 *     have to manage)
 *   - IP-bucketed rate limit
 *
 * Expected body:
 *   {
 *     subject:      string            required
 *     description:  string            required
 *     priority?:    "Low"|"Medium"|"High"|"Critical"   → TicketPriority
 *     clientEmail:  string            required
 *     clientName:   string            required
 *     channel?:     "WEBSITE_FORM"|"EMAIL"|"PHONE"     default WEBSITE_FORM
 *     source?:      string            originating domain
 *     brand?:       "VCS"|"BSL"|"DPL" brand code to scope the ticket
 *   }
 *
 * Behavior:
 *   - Looks up Brand by code (if provided)
 *   - Finds an existing Client by `{companyName: clientName, email: clientEmail, brandId}`
 *     or creates a new one inside the same brand
 *   - Creates a Ticket with the resolved brand + client, status OPEN,
 *     channel API/WEBSITE_FORM, and a computed slaDueAt
 *   - Dispatches TICKET_CREATED to outbound subscribers
 *   - Returns `{ ticketId, number }`
 */

const DEFAULT_ALLOWED = [
  "https://digitalpointllc.com",
  "https://www.digitalpointllc.com",
  "https://virtualcustomersolution.com",
  "https://www.virtualcustomersolution.com",
  "https://backup-solutions.vercel.app",
  "https://backupsolutions.tech",
  "https://www.backupsolutions.tech",
];
const ALLOWED_ORIGINS = (
  process.env.WEBHOOK_ALLOWED_ORIGINS || DEFAULT_ALLOWED.join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Secret, X-Webhook-Signature",
    Vary: "Origin",
  };
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "LEAD_WEBHOOK_SECRET not set — accepting ticket webhook without signature check"
    );
    return true;
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "");
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

type IncomingBody = {
  subject?: unknown;
  description?: unknown;
  priority?: unknown;
  clientEmail?: unknown;
  clientName?: unknown;
  channel?: unknown;
  source?: unknown;
  brand?: unknown;
};

function normalizePriority(raw: unknown): TicketPriorityLike {
  if (typeof raw !== "string") return "MEDIUM";
  const v = raw.trim().toUpperCase();
  if (v === "CRITICAL" || v === "URGENT") return "URGENT";
  if (v === "HIGH") return "HIGH";
  if (v === "LOW") return "LOW";
  return "MEDIUM";
}

function normalizeChannel(raw: unknown): "EMAIL" | "WEB" | "CHAT" | "PHONE" | "API" {
  if (typeof raw !== "string") return "API";
  const v = raw.trim().toUpperCase();
  if (v === "EMAIL") return "EMAIL";
  if (v === "PHONE") return "PHONE";
  if (v === "CHAT") return "CHAT";
  if (v === "WEB" || v === "WEBSITE_FORM" || v === "WEBSITE") return "WEB";
  return "API";
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const baseHeaders = corsHeaders(origin);

  try {
    // 60 ticket submissions / minute / IP
    const limited = await rateLimit("webhook-ticket", req, {
      limit: 60,
      windowSec: 60,
    });
    if (!limited.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: baseHeaders }
      );
    }

    const rawBody = await req.text();
    const sig = req.headers.get("x-webhook-signature");
    if (!verifySignature(rawBody, sig)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401, headers: baseHeaders }
      );
    }

    let data: IncomingBody;
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: baseHeaders }
      );
    }

    const subject = typeof data.subject === "string" ? clampLength(sanitizeText(data.subject), 200) : "";
    const description =
      typeof data.description === "string" ? clampLength(data.description, 8000) : "";
    const clientEmail =
      typeof data.clientEmail === "string" ? data.clientEmail.trim().toLowerCase() : "";
    const clientName =
      typeof data.clientName === "string" ? clampLength(sanitizeText(data.clientName), 200) : "";

    if (!subject || !description || !clientEmail || !clientName) {
      return NextResponse.json(
        { error: "subject, description, clientName, clientEmail are required" },
        { status: 400, headers: baseHeaders }
      );
    }

    const priority = normalizePriority(data.priority);
    const channel = normalizeChannel(data.channel);
    const brandCode = typeof data.brand === "string" ? data.brand.trim().toUpperCase() : null;

    // Resolve brand by code (if provided)
    let brandId: string | null = null;
    if (brandCode) {
      const brand = await prisma.brand.findUnique({
        where: { code: brandCode },
        select: { id: true },
      });
      brandId = brand?.id ?? null;
    }

    // Find or create client — matched by email within the brand scope.
    // If the brand is unknown we still try to match on email alone so
    // existing clients aren't duplicated on every submission.
    let client = await prisma.client.findFirst({
      where: {
        email: clientEmail,
        ...(brandId ? { brandId } : {}),
      },
      select: { id: true },
    });
    if (!client && brandId) {
      // Create a lightweight shell — the CRM team can enrich it later
      client = await prisma.client.create({
        data: {
          companyName: clientName,
          contactName: clientName,
          email: clientEmail,
          brandId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
    }

    const slaDueAt = computeSlaDueAt(priority);

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        status: "OPEN",
        priority,
        channel,
        tags: [],
        brandId,
        clientId: client?.id ?? null,
        slaDueAt,
      },
      select: { id: true, number: true, brandId: true },
    });

    // Fan-out to outbound webhook subscribers
    try {
      await dispatchWebhook(
        "TICKET_CREATED",
        {
          id: ticket.id,
          number: ticket.number,
          subject,
          priority,
          channel,
          clientName,
          clientEmail,
          brand: brandCode,
        },
        { brandId: ticket.brandId }
      );
    } catch (err) {
      console.error("Ticket webhook dispatch error:", err);
    }

    // Best-effort notification email
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Alpha CRM <crm@fu-corp.com>",
          to: ["faizi@digitalpointllc.com", "umi@digitalpointllc.com"],
          subject: `New ${priority} Ticket #${ticket.number}: ${subject}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#6366F1;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:18px;">New Support Ticket</h1>
              </div>
              <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Ticket</td><td style="padding:8px 0;font-weight:600;font-size:13px;">#${ticket.number}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Subject</td><td style="padding:8px 0;font-size:13px;">${subject}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Priority</td><td style="padding:8px 0;font-weight:700;font-size:13px;color:${priority === "URGENT" ? "#EF4444" : priority === "HIGH" ? "#F59E0B" : "#3B82F6"};">${priority}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Client</td><td style="padding:8px 0;font-size:13px;">${clientName} &lt;${clientEmail}&gt;</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Brand</td><td style="padding:8px 0;font-size:13px;">${brandCode || "—"}</td></tr>
                </table>
                <div style="margin-top:16px;padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#374151;white-space:pre-wrap;">${description}</div>
                <div style="margin-top:16px;text-align:center;">
                  <a href="https://fu-corp-crm.vercel.app/tickets" style="display:inline-block;padding:10px 24px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">Open ticket</a>
                </div>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Ticket webhook email error:", emailErr);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        ticketId: ticket.id,
        number: ticket.number,
      },
      { status: 201, headers: baseHeaders }
    );
  } catch (err) {
    console.error("Ticket webhook error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: baseHeaders }
    );
  }
}
