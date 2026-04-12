import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantUserWhere } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  baseSalary: z.number().nonnegative().optional(),
  bonus: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  status: z.enum(["PENDING", "PAID"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Tenant ownership check
    const existing = await prisma.payrollRecord.findFirst({
      where: { id, employee: tenantUserWhere(user) },
    });
    if (!existing) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });

    const nextBase = parsed.data.baseSalary ?? existing.baseSalary;
    const nextBonus = parsed.data.bonus ?? existing.bonus;
    const nextDeductions = parsed.data.deductions ?? existing.deductions;

    const record = await prisma.payrollRecord.update({
      where: { id },
      data: {
        baseSalary: nextBase,
        bonus: nextBonus,
        deductions: nextDeductions,
        netPay: nextBase + nextBonus - nextDeductions,
        ...(parsed.data.status && { status: parsed.data.status }),
        ...(parsed.data.status === "PAID" && { paidAt: new Date() }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Notify employee on payment
    if (parsed.data.status === "PAID" && existing.status !== "PAID") {
      try {
        createNotification({
          type: "INVOICE_PAID",
          title: "Salary Paid",
          message: `Your payroll for ${record.month}/${record.year} has been marked as paid`,
          userId: existing.employeeId,
          data: { payrollId: id },
        });
      } catch (notifyErr) {
        console.error("[payroll.PATCH] notify error (non-fatal):", notifyErr);
      }
    }

    return NextResponse.json(record);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[payroll.PATCH] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to update payroll record" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;

    const existing = await prisma.payrollRecord.findFirst({
      where: { id, employee: tenantUserWhere(user) },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Cannot delete a payroll record that has been paid" },
        { status: 400 }
      );
    }

    await prisma.payrollRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[payroll.DELETE] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to delete payroll record" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
