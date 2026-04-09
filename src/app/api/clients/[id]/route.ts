import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel, getSystemUserId } from "@/lib/notifications";
import { requireAuth, tenantWhere } from "@/lib/auth";

function unauthorized(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Tenant-scoped ownership check. Without this, any authenticated
    // user could PATCH any client record by ID.
    const existing = await prisma.client.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.contactName && { contactName: body.contactName }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.status && { status: body.status }),
        ...(body.healthScore !== undefined && { healthScore: body.healthScore }),
        ...(body.mrr !== undefined && { mrr: body.mrr }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.brandId && { brandId: body.brandId }),
        ...(body.lastContactDate !== undefined && { lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null }),
        ...(body.nextFollowUp !== undefined && { nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null }),
      },
      include: { brand: { select: { code: true, name: true, color: true } } },
    });
    await logAudit({ action: "UPDATE", entity: "Client", entityId: id, userId: actor.id, changes: body }).catch(() => {});
    return NextResponse.json(client);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    // Tenant ownership check before a hard delete — prevents destructive
    // cross-tenant writes.
    const clientRecord = await prisma.client.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { companyName: true },
    });
    if (!clientRecord) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const clientName = clientRecord.companyName || "Unknown";

    // Disconnect or delete all child records before deleting the client
    await prisma.$transaction([
      prisma.task.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      prisma.note.deleteMany({ where: { clientId: id } }),
      prisma.attachment.deleteMany({ where: { clientId: id } }),
      prisma.customerFeedback.deleteMany({ where: { clientId: id } }),
      prisma.invoice.deleteMany({ where: { clientId: id } }),
      prisma.client.delete({ where: { id } }),
    ]);

    await logAudit({ action: "DELETE", entity: "Client", entityId: id, userId: actor.id }).catch(() => {});

    // Notify team
    const systemUser = await getSystemUserId();
    createNotification({ type: "CLIENT_DELETED", title: "Client Removed", message: `${clientName} has been removed`, userId: "all" });
    if (systemUser) autoPostToChannel("general", `🗑️ Client **${clientName}** removed`, systemUser, "SYSTEM");

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("Client delete error:", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
