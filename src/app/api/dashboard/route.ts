import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");

    // Build brand-scoped WHERE clauses
    const brandFilter = brand ? { brand: { code: brand } } : {};
    const clientWhere = { status: "ACTIVE" as const, ...brandFilter };
    const userWhere = brand
      ? { status: "ACTIVE" as const, brand: { code: brand } }
      : { status: "ACTIVE" as const };
    const taskWhere = brand ? { brand: { code: brand } } : {};
    const taskCompletedWhere = { status: "COMPLETED" as const, ...taskWhere };
    const leadWhere = brand ? { brand: { code: brand } } : {};
    const leadWonWhere = { status: "WON" as const, ...leadWhere };
    const invoiceBrandFilter = brand ? { brand: { code: brand } } : {};

    const [
      clientCount,
      employeeCount,
      taskCount,
      completedCount,
      todoCount,
      inProgressCount,
      reviewCount,
      blockedCount,
      leadCount,
      wonLeads,
      invoicePaid,
      invoicePending,
      invoiceOverdue,
      totalMRR,
    ] = await Promise.all([
      prisma.client.count({ where: clientWhere }),
      prisma.user.count({ where: userWhere }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: taskCompletedWhere }),
      prisma.task.count({ where: { status: "TODO" as const, ...taskWhere } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" as const, ...taskWhere } }),
      prisma.task.count({ where: { status: "REVIEW" as const, ...taskWhere } }),
      prisma.task.count({ where: { status: "BLOCKED" as const, ...taskWhere } }),
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: leadWonWhere }),
      prisma.invoice.aggregate({
        where: { status: "PAID", ...invoiceBrandFilter },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "PENDING", ...invoiceBrandFilter },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "OVERDUE", ...invoiceBrandFilter },
        _sum: { total: true },
      }),
      prisma.client.aggregate({
        where: clientWhere,
        _sum: { mrr: true },
      }),
    ]);

    return NextResponse.json({
      clients: clientCount,
      employees: employeeCount,
      tasks: taskCount,
      completedTasks: completedCount,
      todoTasks: todoCount,
      inProgressTasks: inProgressCount,
      reviewTasks: reviewCount,
      blockedTasks: blockedCount,
      leads: leadCount,
      wonLeads,
      revenue: totalMRR._sum.mrr || 0,
      invoicesPaid: invoicePaid._sum.total || 0,
      invoicesPending: invoicePending._sum.total || 0,
      invoicesOverdue: invoiceOverdue._sum.total || 0,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Dashboard API error:", err);
    // Previously returned `NextResponse.json(null)` which masked DB
    // failures as "no data" on the client — a critical observability
    // gap. Now surface a real 500 with an error code + message so the
    // dashboard can show an error state and ops can see failures in logs.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Dashboard query failed",
        code: "DASHBOARD_QUERY_FAILED",
        detail: message,
      },
      { status: 500 }
    );
  }
}
