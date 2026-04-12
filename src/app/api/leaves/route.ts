import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantUserWhere } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { calculateLeaveBalance } from "@/lib/leaves";

export const dynamic = "force-dynamic";

const leaveCreateSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "CASUAL", "UNPAID"]),
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
  reason: z.string().trim().max(1000).optional().nullable(),
  employeeId: z.string().optional(), // managers can create on behalf of employee
});

function countBusinessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let days = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const until = new Date(end);
  until.setHours(0, 0, 0, 0);
  while (cursor <= until) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const employeeId = url.searchParams.get("employeeId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};

    // Scope: regular employees only see their own leaves.
    // Managers and super-admins see leaves for all users in their tenant.
    if (!isManager(user.role)) {
      where.employeeId = user.id;
    } else {
      // Apply tenant scoping via employee relation
      const userScope = tenantUserWhere(user);
      if (Object.keys(userScope).length > 0) {
        where.employee = userScope;
      }
      if (employeeId) where.employeeId = employeeId;
    }

    if (status) where.status = status;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.startDate = range;
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(leaves);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[leaves.GET] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to load leaves" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const raw = await req.json().catch(() => null);
    if (!raw) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = leaveCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const targetEmployeeId =
      input.employeeId && isManager(user.role) ? input.employeeId : user.id;

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "endDate cannot be before startDate" }, { status: 400 });
    }

    const days = countBusinessDays(startDate, endDate);
    if (days <= 0) {
      return NextResponse.json(
        { error: "Leave must span at least one business day" },
        { status: 400 }
      );
    }

    // Enforce balance on paid leave types
    if (input.type !== "UNPAID") {
      const balance = await calculateLeaveBalance(targetEmployeeId, new Date().getFullYear());
      const typeBalance = balance[input.type];
      if (typeBalance.remaining < days) {
        return NextResponse.json(
          {
            error: `Insufficient ${input.type.toLowerCase()} balance. Remaining: ${typeBalance.remaining} day(s), requested: ${days} day(s).`,
          },
          { status: 400 }
        );
      }
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: targetEmployeeId,
        type: input.type,
        startDate,
        endDate,
        days,
        reason: input.reason || null,
        status: "PENDING",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Notify managers that a leave request is waiting
    try {
      createNotification({
        type: "TEAM_UPDATE",
        title: "Leave Request",
        message: `${leave.employee.firstName} ${leave.employee.lastName} requested ${days} day(s) of ${input.type.toLowerCase()} leave`,
        userId: "all",
        data: { leaveId: leave.id, employeeId: targetEmployeeId },
      });
    } catch (notifyErr) {
      console.error("[leaves.POST] notify error (non-fatal):", notifyErr);
    }

    return NextResponse.json(leave, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[leaves.POST] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to create leave" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
