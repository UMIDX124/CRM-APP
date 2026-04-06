import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel, getSystemUserId } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
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
      },
      include: { brand: { select: { code: true, color: true } } },
    });
    await logAudit({ action: "UPDATE", entity: "Lead", entityId: id, userId: "system", changes: body }).catch(() => {});

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
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    await logAudit({ action: "DELETE", entity: "Lead", entityId: id, userId: "system" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
