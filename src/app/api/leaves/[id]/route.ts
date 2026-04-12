import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantUserWhere } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]).optional(),
  reason: z.string().max(1000).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, brandId: true, brand: { select: { companyId: true } } } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    // Scope: employees can only see their own; managers see within tenant
    if (leave.employeeId !== user.id) {
      if (!isManager(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (user.role !== "SUPER_ADMIN") {
        if (user.companyId && leave.employee.brand?.companyId !== user.companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    return NextResponse.json(leave);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to load leave" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Only managers can approve or reject leaves" }, { status: 403 });
    }

    const { id } = await params;
    const raw = await req.json().catch(() => null);
    if (!raw) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    // Tenant ownership check via the employee relation
    const existing = await prisma.leave.findFirst({
      where: { id, employee: tenantUserWhere(user) },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    const newStatus = parsed.data.status ?? existing.status;

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: newStatus === "APPROVED" || newStatus === "REJECTED" ? user.id : null,
        approvedAt: newStatus === "APPROVED" || newStatus === "REJECTED" ? new Date() : null,
        ...(parsed.data.reason !== undefined && { reason: parsed.data.reason }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify the employee
    try {
      const verb =
        newStatus === "APPROVED" ? "approved" : newStatus === "REJECTED" ? "rejected" : "updated";
      createNotification({
        type: "TEAM_UPDATE",
        title: `Leave ${verb}`,
        message: `Your ${existing.type.toLowerCase()} leave request was ${verb} by ${user.firstName} ${user.lastName}`,
        userId: existing.employeeId,
        data: { leaveId: id },
      });
    } catch (notifyErr) {
      console.error("[leaves.PATCH] notify error (non-fatal):", notifyErr);
    }

    return NextResponse.json(leave);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[leaves.PATCH] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to update leave" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Employees can only delete their own pending leaves
    const existing = await prisma.leave.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    const isOwner = existing.employeeId === user.id;
    const isMgr = isManager(user.role);
    if (!isOwner && !isMgr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isOwner && !isMgr && existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot delete a leave that has been reviewed" },
        { status: 400 }
      );
    }

    await prisma.leave.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[leaves.DELETE] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to delete leave" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
