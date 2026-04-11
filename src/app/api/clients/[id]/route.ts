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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Tenant-scoped ownership check. Without this, any authenticated
    // user could PATCH any client record by ID.
    const existing = await prisma.client.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Resolve brandCode → brandId when provided
    let resolvedBrandId: string | undefined = body.brandId;
    if (!resolvedBrandId && typeof body.brandCode === "string" && body.brandCode) {
      const brand = await prisma.brand.findUnique({
        where: { code: body.brandCode },
        select: { id: true },
      });
      if (!brand) {
        return NextResponse.json({ error: `Unknown brand code "${body.brandCode}"` }, { status: 400 });
      }
      resolvedBrandId = brand.id;
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.companyName && { companyName: String(body.companyName).trim() }),
        ...(body.contactName && { contactName: String(body.contactName).trim() }),
        ...(body.email && { email: String(body.email).trim() }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.country !== undefined && { country: body.country || null }),
        ...(body.status && { status: body.status }),
        ...(body.healthScore !== undefined && { healthScore: Number(body.healthScore) }),
        ...(body.mrr !== undefined && { mrr: Number(body.mrr) }),
        ...(body.source !== undefined && { source: body.source || null }),
        ...(body.website !== undefined && { website: body.website || null }),
        ...(Array.isArray(body.services) && { services: body.services.filter((s: unknown) => typeof s === "string") }),
        ...(resolvedBrandId && { brandId: resolvedBrandId }),
        ...(body.lastContactDate !== undefined && { lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null }),
        ...(body.nextFollowUp !== undefined && { nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null }),
        ...(body.portalAccess !== undefined && { portalAccess: Boolean(body.portalAccess) }),
      },
      include: {
        brand: { select: { code: true, name: true, color: true } },
        _count: { select: { tasks: { where: { status: { notIn: ["COMPLETED", "BLOCKED"] } } } } },
      },
    });
    await logAudit({ action: "UPDATE", entity: "Client", entityId: id, userId: actor.id, changes: body }).catch(() => {});
    return NextResponse.json(client);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("[clients.PATCH] error:", e);
    const msg = e instanceof Error ? e.message : "Update failed";
    const safe = msg.includes("Unique constraint")
      ? "A client with this email already exists"
      : "Failed to update client";
    return NextResponse.json({ error: safe }, { status: 400 });
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
