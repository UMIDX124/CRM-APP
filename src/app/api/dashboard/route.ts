import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
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
      leads: leadCount,
      wonLeads,
      revenue: totalMRR._sum.mrr || 0,
      invoicesPaid: invoicePaid._sum.total || 0,
      invoicesPending: invoicePending._sum.total || 0,
      invoicesOverdue: invoiceOverdue._sum.total || 0,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(null);
  }
}
