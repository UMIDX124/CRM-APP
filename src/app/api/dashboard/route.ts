import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [clientCount, employeeCount, taskCount, completedCount, leadCount, wonLeads, invoicePaid, invoicePending, invoiceOverdue] = await Promise.all([
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "WON" } }),
      prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: "PENDING" }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: "OVERDUE" }, _sum: { total: true } }),
    ]);

    const totalMRR = await prisma.client.aggregate({ _sum: { mrr: true } });

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
  } catch {
    // DB not connected — return null to trigger mock data fallback
    return NextResponse.json(null);
  }
}
