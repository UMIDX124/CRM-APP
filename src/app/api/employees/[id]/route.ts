import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    await logAudit({ action: "UPDATE", entity: "User", entityId: id, userId: "system", changes: body }).catch(() => {});
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.user.update({ where: { id }, data: { status: "TERMINATED", isActive: false } });
    await logAudit({ action: "DELETE", entity: "User", entityId: id, userId: "system" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
