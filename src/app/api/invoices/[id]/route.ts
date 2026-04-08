import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhooks";
import { requireAuth } from "@/lib/auth";

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
    const previous = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.paidDate !== undefined && { paidDate: body.paidDate ? new Date(body.paidDate) : null }),
        ...(body.items && { items: body.items }),
        ...(body.subtotal !== undefined && { subtotal: body.subtotal }),
        ...(body.tax !== undefined && { tax: body.tax }),
        ...(body.total !== undefined && { total: body.total }),
        ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        brand: { select: { code: true, color: true } },
      },
    });
    await logAudit({ action: "UPDATE", entity: "Invoice", entityId: id, userId: actor.id, changes: body }).catch(() => {});

    // Fire INVOICE_PAID when status transitions into PAID
    if (body.status === "PAID" && previous?.status !== "PAID") {
      await dispatchWebhook(
        "INVOICE_PAID",
        {
          id: invoice.id,
          number: invoice.number,
          total: invoice.total,
          clientName: invoice.client?.companyName,
          brand: invoice.brand?.code ?? null,
        },
        { brandId: invoice.brandId }
      );
    }
    return NextResponse.json(invoice);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Invoice update error:", e);
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;
    await prisma.invoice.delete({ where: { id } });
    await logAudit({ action: "DELETE", entity: "Invoice", entityId: id, userId: actor.id }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Invoice delete error:", e);
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
