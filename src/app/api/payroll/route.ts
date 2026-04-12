import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantUserWhere } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  baseSalary: z.number().nonnegative(),
  bonus: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

const bulkSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  bonusDefault: z.number().nonnegative().optional(),
  deductionsDefault: z.number().nonnegative().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const employeeId = url.searchParams.get("employeeId");
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {};

    // Scope: non-managers only see their own payroll
    if (!isManager(user.role)) {
      where.employeeId = user.id;
    } else {
      const userScope = tenantUserWhere(user);
      if (Object.keys(userScope).length > 0) where.employee = userScope;
      if (employeeId) where.employeeId = employeeId;
    }

    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (status) where.status = status;

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true, avatar: true, title: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return NextResponse.json(records);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[payroll.GET] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to load payroll" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // Bulk-process mode: { bulk: true, month, year }
    if (raw.bulk === true) {
      const parsed = bulkSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Validation failed" },
          { status: 400 }
        );
      }

      // Fetch every active employee inside the manager's tenant
      const employees = await prisma.user.findMany({
        where: {
          ...tenantUserWhere(user),
          status: "ACTIVE",
          isActive: true,
          salary: { not: null },
        },
        select: { id: true, salary: true, currency: true },
      });

      let created = 0;
      let skipped = 0;

      for (const emp of employees) {
        if (!emp.salary) {
          skipped += 1;
          continue;
        }
        const bonus = parsed.data.bonusDefault ?? 0;
        const deductions = parsed.data.deductionsDefault ?? 0;
        try {
          await prisma.payrollRecord.create({
            data: {
              employeeId: emp.id,
              month: parsed.data.month,
              year: parsed.data.year,
              baseSalary: emp.salary,
              bonus,
              deductions,
              netPay: emp.salary + bonus - deductions,
              currency: emp.currency || "USD",
              status: "PENDING",
            },
          });
          created += 1;
        } catch (err) {
          // Unique constraint → already processed for this month/year
          if (err instanceof Error && err.message.includes("Unique constraint")) {
            skipped += 1;
          } else {
            console.error("[payroll.POST bulk] failed for", emp.id, err);
            skipped += 1;
          }
        }
      }

      return NextResponse.json({ created, skipped, total: employees.length });
    }

    // Single-record mode
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Verify target employee is in tenant
    const target = await prisma.user.findFirst({
      where: { id: input.employeeId, ...tenantUserWhere(user) },
      select: { id: true, currency: true },
    });
    if (!target) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const bonus = input.bonus ?? 0;
    const deductions = input.deductions ?? 0;
    const netPay = input.baseSalary + bonus - deductions;

    try {
      const record = await prisma.payrollRecord.create({
        data: {
          employeeId: input.employeeId,
          month: input.month,
          year: input.year,
          baseSalary: input.baseSalary,
          bonus,
          deductions,
          netPay,
          currency: input.currency ?? target.currency ?? "USD",
          notes: input.notes ?? null,
          status: "PENDING",
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      return NextResponse.json(record, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "Payroll record for this employee and month already exists" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[payroll.POST] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to create payroll record" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
