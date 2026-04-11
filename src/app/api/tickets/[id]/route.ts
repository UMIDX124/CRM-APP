import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook, type WebhookEventName } from "@/lib/webhooks";
import { sendTicketStatusChange } from "@/lib/email";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;

    // Tenant-scoped fetch. Prevents a caller in company A from reading
    // a ticket in company B by guessing the id. Returns 404 on scope
    // miss so we don't leak existence across tenants.
    const ticket = await prisma.ticket.findFirst({
      where: { id, ...tenantWhere(user) },
      include: {
        brand: { select: { code: true, color: true, name: true } },
        client: {
          select: { id: true, companyName: true, contactName: true, email: true },
        },
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 *
 * Status transitions auto-set timestamps:
 *  - first non-OPEN status → firstResponseAt
 *  - RESOLVED → resolvedAt
 *  - CLOSED → closedAt
 * Status changes also dispatch TICKET_STATUS_CHANGED + TICKET_RESOLVED.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    // Tenant-scoped existence check. findFirst + tenantWhere closes the
    // cross-tenant mutation bypass.
    const existing = await prisma.ticket.findFirst({
      where: { id, ...tenantWhere(user) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "subject",
      "description",
      "status",
      "priority",
      "channel",
      "assigneeId",
      "clientId",
      "brandId",
      "tags",
      "slaDueAt",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if ("slaDueAt" in updateData && updateData.slaDueAt) {
      updateData.slaDueAt = new Date(updateData.slaDueAt as string);
    }

    const statusChanged =
      typeof body.status === "string" && body.status !== existing.status;
    if (statusChanged) {
      if (existing.status === "OPEN" && !existing.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }
      if (body.status === "RESOLVED" && !existing.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (body.status === "CLOSED" && !existing.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { code: true, color: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
    });

    if (statusChanged) {
      const events: WebhookEventName[] = ["TICKET_STATUS_CHANGED"];
      if (ticket.status === "RESOLVED") events.push("TICKET_RESOLVED");
      for (const ev of events) {
        await dispatchWebhook(
          ev,
          {
            id: ticket.id,
            number: ticket.number,
            subject: ticket.subject,
            status: ticket.status,
            previousStatus: existing.status,
            priority: ticket.priority,
            brand: ticket.brand?.code ?? null,
          },
          { brandId: ticket.brandId }
        );
      }

      // Best-effort email to the client when status flips. Resolves quietly
      // when no client/email is associated.
      const clientRow = ticket.clientId
        ? await prisma.client.findUnique({
            where: { id: ticket.clientId },
            select: { email: true },
          })
        : null;
      if (clientRow?.email) {
        const appUrl = process.env.APP_URL || "https://alpha-command-center.vercel.app";
        // Fire-and-forget — the .catch() is REQUIRED, otherwise a
        // Resend rejection becomes an unhandled promise rejection
        // which can crash the function instance.
        sendTicketStatusChange(
          clientRow.email,
          {
            number: ticket.number,
            subject: ticket.subject,
            status: ticket.status,
          },
          appUrl
        ).catch((err) => {
          console.error("[tickets] sendTicketStatusChange failed:", err);
        });
      }
    }

    await logAudit({
      action: "UPDATE",
      entity: "Ticket",
      entityId: id,
      userId: user.id,
      changes: updateData,
    });

    return NextResponse.json(ticket);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;

    const existing = await prisma.ticket.findFirst({
      where: { id, ...tenantWhere(user) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.ticket.delete({ where: { id } });
    await logAudit({
      action: "DELETE",
      entity: "Ticket",
      entityId: id,
      userId: user.id,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
