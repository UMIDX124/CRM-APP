import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel, getSystemUserId } from "@/lib/notifications";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { calculateLeadScore } from "@/lib/scoring";

function unauthorized(e: unknown) {
  if (e instanceof Error && e.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Tenant ownership check — closes the cross-tenant PATCH bypass.
    const existing = await prisma.lead.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: {
        id: true, source: true, value: true, phone: true, services: true,
        status: true, lastContactDate: true, createdAt: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Recompute lead score from the merged post-PATCH values
    const nextLeadScore = calculateLeadScore({
      source: body.source !== undefined ? body.source : existing.source,
      value: body.value !== undefined ? body.value : existing.value,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      services: body.services !== undefined ? body.services : existing.services,
      status: body.status !== undefined ? body.status : existing.status,
      lastContactDate:
        body.lastContactDate !== undefined
          ? body.lastContactDate
            ? new Date(body.lastContactDate)
            : null
          : existing.lastContactDate,
      createdAt: existing.createdAt,
    });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.contactName && { contactName: body.contactName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.status && { status: body.status }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.probability !== undefined && { probability: body.probability }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.services && { services: body.services }),
        ...(body.salesRepId !== undefined && { salesRepId: body.salesRepId }),
        ...(body.brandId && { brandId: body.brandId }),
        ...(body.expectedClose !== undefined && { expectedClose: body.expectedClose ? new Date(body.expectedClose) : null }),
        ...(body.lastContactDate !== undefined && { lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null }),
        ...(body.nextContactDate !== undefined && { nextContactDate: body.nextContactDate ? new Date(body.nextContactDate) : null }),
        ...(body.nextAction !== undefined && { nextAction: body.nextAction }),
        ...(body.notes !== undefined && { notes: body.notes }),
        leadScore: nextLeadScore,
      },
      include: { brand: { select: { code: true, color: true } } },
    });
    await logAudit({ action: "UPDATE", entity: "Lead", entityId: id, userId: actor.id, changes: body }).catch(() => {});

    // Notify on status changes
    if (body.status) {
      const statusLabels: Record<string, string> = { NEW: "New", QUALIFIED: "Qualified", PROPOSAL_SENT: "Proposal Sent", NEGOTIATION: "Negotiation", WON: "Won", LOST: "Lost" };
      const label = statusLabels[body.status] || body.status;
      const systemUser = await getSystemUserId();

      createNotification({ type: "LEAD_STATUS", title: `Lead → ${label}`, message: `${lead.companyName} moved to ${label}`, userId: "all", data: { leadId: id } });
      if (systemUser) {
        autoPostToChannel("leads", `📊 **${lead.companyName}** moved to **${label}**${body.status === "WON" ? ` 🎉 ($${lead.value?.toLocaleString()})` : ""}`, systemUser, "LEAD_ALERT", { leadId: id });
      }
    }

    return NextResponse.json(lead);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Lead update error:", e);
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const existing = await prisma.lead.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id } });
    await logAudit({ action: "DELETE", entity: "Lead", entityId: id, userId: actor.id }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Lead delete error:", e);
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
