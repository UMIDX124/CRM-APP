import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portal-auth";

export async function GET() {
  try {
    const client = await requirePortalAuth();

    const [invoices, tasks, messages, recentActivity] = await Promise.all([
      prisma.invoice.findMany({
        where: { clientId: client.id },
        select: { id: true, number: true, total: true, status: true, dueDate: true },
        orderBy: { dueDate: "desc" },
        take: 5,
      }),
      prisma.task.findMany({
        where: { clientId: client.id, status: { not: "COMPLETED" } },
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.portalMessage.count({ where: { clientId: client.id } }),
      prisma.task.findMany({
        where: { clientId: client.id },
        select: { id: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const invoiceStats = {
      total: invoices.reduce((a, i) => a + i.total, 0),
      paid: invoices.filter((i) => i.status === "PAID").reduce((a, i) => a + i.total, 0),
      pending: invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE").reduce((a, i) => a + i.total, 0),
    };

    return NextResponse.json({
      client: { companyName: client.companyName, contactName: client.contactName },
      invoiceStats,
      recentInvoices: invoices,
      activeTasks: tasks,
      messageCount: messages,
      recentActivity,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "PortalUnauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[portal/dashboard]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
