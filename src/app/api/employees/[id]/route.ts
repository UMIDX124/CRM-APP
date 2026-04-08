import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireAuth, isManager } from "@/lib/auth";

function unauthorized(e: unknown) {
  if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    if (!isManager(actor.role)) throw new Error("Forbidden");
    const { id } = await params;
    const body = await req.json();
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.role && { role: body.role }),
        ...(body.department && { department: body.department }),
        ...(body.status && { status: body.status }),
        ...(body.brandId && { brandId: body.brandId }),
        ...(body.salary !== undefined && { salary: body.salary }),
        ...(body.skills && { skills: body.skills }),
      },
      include: { brand: { select: { code: true, name: true, color: true } } },
    });
    await logAudit({ action: "UPDATE", entity: "User", entityId: id, userId: actor.id, changes: body }).catch(() => {});
    return NextResponse.json(user);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Employee update error:", e);
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    if (!isManager(actor.role)) throw new Error("Forbidden");
    const { id } = await params;
    await prisma.user.update({ where: { id }, data: { status: "TERMINATED", isActive: false } });
    await logAudit({ action: "DELETE", entity: "User", entityId: id, userId: actor.id }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Employee delete error:", e);
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
