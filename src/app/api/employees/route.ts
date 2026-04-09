import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, hashPassword, tenantUserWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const department = url.searchParams.get("department");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    // `?minimal=1` returns a lightweight shape for pickers (DM modal,
    // mention dropdown fallback). Drops salary, email, phone, skills,
    // lastLogin, hireDate — so the payload shrinks from ~1KB/employee
    // to ~150B/employee and managers can't accidentally leak PII to
    // UI surfaces that don't actually need it.
    const minimal = url.searchParams.get("minimal") === "1";

    // Tenant scope first — replaces the previous "brandId = user.brandId"
    // shortcut that leaked SUPER_ADMIN access across companies.
    const where: Record<string, unknown> = { ...tenantUserWhere(user) };
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    // Split the two selects into separate calls so TypeScript can narrow
    // the return type and we can include `_count: { assignedTasks }` on
    // the full shape without tripping the minimal shape.
    if (minimal) {
      const employees = await prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          avatar: true,
          brand: { select: { code: true, color: true } },
        },
        orderBy: [{ firstName: "asc" }],
        take: 500,
      });
      return NextResponse.json(employees);
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatar: true, title: true, role: true, department: true, status: true,
        brandId: true, hireDate: true, salary: true, currency: true, skills: true,
        lastLogin: true, createdAt: true,
        brand: { select: { code: true, name: true, color: true } },
        // Real task metrics replace the hardcoded `performanceScore: 85`
        // / `workload: 50` / `tasksCompleted: 0` values the UI used to
        // fabricate. We expose raw counts; the UI computes the score.
        _count: {
          select: {
            assignedTasks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Enrich each row with a completed-task count via a single grouped
    // query instead of N+1 per-employee calls.
    const employeeIds = employees.map((e) => e.id);
    const completedByAssignee = employeeIds.length
      ? await prisma.task.groupBy({
          by: ["assigneeId"],
          where: { assigneeId: { in: employeeIds }, status: "COMPLETED" },
          _count: { _all: true },
        })
      : [];
    const completedMap = new Map<string, number>(
      completedByAssignee.map((row) => [row.assigneeId ?? "", row._count._all])
    );

    const enriched = employees.map((emp) => {
      const totalTasks = emp._count?.assignedTasks ?? 0;
      const tasksCompleted = completedMap.get(emp.id) ?? 0;
      const performanceScore =
        totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
      return {
        ...emp,
        totalTasks,
        tasksCompleted,
        performanceScore,
      };
    });

    return NextResponse.json(enriched);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, title, role, department, brandId, salary, skills, hireDate } = body;

    if (!firstName || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Generate a random temporary password — user must change on first login
    const tempPassword = `FU-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await hashPassword(tempPassword);

    const employee = await prisma.user.create({
      data: {
        firstName, lastName: lastName || "", email, phone, title,
        role: role || "EMPLOYEE", department, brandId, salary,
        skills: skills || [], hireDate: hireDate ? new Date(hireDate) : new Date(),
        passwordHash, currency: "USD",
      },
    });

    await logAudit({
      action: "CREATE", entity: "User", entityId: employee.id, userId: user.id,
      changes: { employee: { old: null, new: { firstName, lastName, email, role, brandId } } },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
