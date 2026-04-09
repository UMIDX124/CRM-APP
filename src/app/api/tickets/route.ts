import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhooks";
import { computeSlaDueAt, type TicketPriorityLike } from "@/lib/sla";
import { sendTicketAssignedToAgent } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/tickets
 *
 * Filters: status, priority, brand (code), assigneeId, clientId, q
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const brand = url.searchParams.get("brand");
    const assigneeId = url.searchParams.get("assigneeId");
    const clientId = url.searchParams.get("clientId");
    const q = url.searchParams.get("q");

    // Tenant scope first — stops a DEPT_HEAD from querying another
    // company's tickets by passing ?brand=OTHER.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }
    if (assigneeId) where.assigneeId = assigneeId;
    if (clientId) where.clientId = clientId;
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        brand: { select: { code: true, color: true } },
        client: { select: { id: true, companyName: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    // Compute SLA breach flag inline so the client can render badges fast.
    const now = Date.now();
    const enriched = tickets.map((t) => ({
      ...t,
      slaBreached:
        t.slaDueAt &&
        t.status !== "RESOLVED" &&
        t.status !== "CLOSED" &&
        new Date(t.slaDueAt).getTime() < now,
    }));

    return NextResponse.json(enriched);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/tickets
 *
 * Body: { subject, description, priority?, channel?, clientId?, brandId?,
 *         assigneeId?, tags?, slaDueAt? }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // 30 ticket creations per minute per user. Tickets fan out to SLA
    // computation, notifications, email, and webhooks — cheap per-row
    // but worth capping against API key abuse and runaway integrations.
    const rl = await rateLimit("tickets-create", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    if (!body.subject || !body.description) {
      return NextResponse.json(
        { error: "subject and description are required" },
        { status: 400 }
      );
    }

    const priority = (body.priority || "MEDIUM") as TicketPriorityLike;
    // Auto-compute SLA due date from priority unless caller passed an override
    const slaDueAt = body.slaDueAt
      ? new Date(body.slaDueAt)
      : computeSlaDueAt(priority);

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        description: body.description,
        priority,
        channel: body.channel || "WEB",
        status: "OPEN",
        tags: Array.isArray(body.tags) ? body.tags : [],
        brandId: body.brandId ?? null,
        clientId: body.clientId ?? null,
        requesterId: body.requesterId ?? user.id,
        assigneeId: body.assigneeId ?? null,
        slaDueAt,
      },
      include: {
        brand: { select: { code: true, color: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "Ticket",
      entityId: ticket.id,
      userId: user.id,
      changes: { subject: ticket.subject, priority: ticket.priority },
    });

    // Notify assignee — DB notification (auto-pushes via createNotification)
    // and a transactional email if we have one configured
    if (ticket.assigneeId) {
      await createNotification({
        type: "TICKET_ASSIGNED",
        title: `New ticket assigned: #${ticket.number}`,
        message: ticket.subject,
        userId: ticket.assigneeId,
        data: {
          ticketId: ticket.id,
          priority: ticket.priority,
          link: "/tickets",
        },
      });
      if (ticket.assignee?.email) {
        const appUrl = process.env.APP_URL || "https://fu-corp-crm.vercel.app";
        // Fire-and-forget — MUST have a .catch() or a rejection becomes
        // an unhandled promise rejection that can crash the function.
        sendTicketAssignedToAgent(
          ticket.assignee.email,
          {
            number: ticket.number,
            subject: ticket.subject,
            priority: ticket.priority,
          },
          appUrl
        ).catch((err) => {
          console.error("[tickets] sendTicketAssignedToAgent failed:", err);
        });
      }
    }

    await dispatchWebhook(
      "TICKET_CREATED",
      {
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        brand: ticket.brand?.code ?? null,
      },
      { brandId: ticket.brandId }
    );

    return NextResponse.json(ticket, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
