import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
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
    await logAudit({ action: "UPDATE", entity: "Client", entityId: id, userId: "system", changes: body }).catch(() => {});
    return NextResponse.json(client);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Disconnect or delete all child records before deleting the client
    // to avoid foreign key constraint violations
    await prisma.$transaction([
      // Detach tasks from this client (don't delete — tasks may be valuable)
      prisma.task.updateMany({ where: { clientId: id }, data: { clientId: null } }),
      // Delete notes tied to this client
      prisma.note.deleteMany({ where: { clientId: id } }),
      // Delete attachments tied to this client
      prisma.attachment.deleteMany({ where: { clientId: id } }),
      // Delete feedback tied to this client
      prisma.customerFeedback.deleteMany({ where: { clientId: id } }),
      // Delete invoices tied to this client
      prisma.invoice.deleteMany({ where: { clientId: id } }),
      // Now safe to delete the client
      prisma.client.delete({ where: { id } }),
    ]);

    await logAudit({ action: "DELETE", entity: "Client", entityId: id, userId: "system" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("Client delete error:", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
