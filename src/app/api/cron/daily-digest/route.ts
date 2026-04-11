import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification, autoPostToChannel, getSystemUserId } from "@/lib/notifications";

// Vercel Cron: runs daily at 9:00 AM PKT (04:00 UTC)
// Generates a morning brief for each SUPER_ADMIN + DEPT_HEAD

export async function GET(req: Request) {
  // Verify cron secret to prevent public access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Gather stats for the last 24 hours
    const [newLeads, newClients, completedTasks, overdueInvoices, paidInvoices] = await Promise.all([
      prisma.lead.findMany({
        where: { createdAt: { gte: yesterday } },
        select: { companyName: true, value: true, source: true },
      }),
      prisma.client.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.task.count({ where: { completedAt: { gte: yesterday } } }),
      prisma.invoice.findMany({
        where: { status: "OVERDUE" },
        select: { number: true, total: true, client: { select: { companyName: true } } },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAID", paidDate: { gte: yesterday } },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    // Tasks due today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tasksDueToday = await prisma.task.findMany({
      where: { dueDate: { gte: todayStart, lt: todayEnd }, status: { not: "COMPLETED" } },
      select: { title: true, priority: true, assignee: { select: { firstName: true, lastName: true } } },
    });

    // Build digest message
    const leadValue = newLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const paidTotal = paidInvoices._sum.total || 0;
    const overdueTotal = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

    const lines = [
      `Good morning! Here's your daily brief for ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}:`,
      "",
      `**New Leads (24h):** ${newLeads.length} worth $${leadValue.toLocaleString()}`,
    ];

    if (newLeads.length > 0) {
      newLeads.slice(0, 3).forEach((l) => {
        lines.push(`  - ${l.companyName} ($${(l.value || 0).toLocaleString()}) via ${l.source || "Direct"}`);
      });
      if (newLeads.length > 3) lines.push(`  ...and ${newLeads.length - 3} more`);
    }

    lines.push("");
    lines.push(`**Tasks Due Today:** ${tasksDueToday.length}`);
    tasksDueToday.slice(0, 3).forEach((t) => {
      const assignee = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : "Unassigned";
      lines.push(`  - ${t.title} (${t.priority}) — ${assignee}`);
    });

    if (overdueInvoices.length > 0) {
      lines.push("");
      lines.push(`**Overdue Invoices:** ${overdueInvoices.length} totaling $${overdueTotal.toLocaleString()}`);
      overdueInvoices.slice(0, 3).forEach((i) => {
        lines.push(`  - ${i.number} — $${i.total.toLocaleString()} (${i.client.companyName})`);
      });
    }

    if (paidInvoices._count > 0) {
      lines.push("");
      lines.push(`**Payments Received (24h):** ${paidInvoices._count} totaling $${paidTotal.toLocaleString()}`);
    }

    lines.push("");
    lines.push(`New clients: ${newClients} | Tasks completed: ${completedTasks}`);

    const digestMessage = lines.join("\n");

    // Notify all managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "DEPT_HEAD", "PROJECT_MANAGER"] }, status: "ACTIVE" },
      select: { id: true },
    });

    for (const mgr of managers) {
      await createNotification({
        type: "SYSTEM",
        title: "Daily Brief",
        message: digestMessage.slice(0, 500),
        userId: mgr.id,
        data: { type: "daily_digest", date: now.toISOString() },
      });
    }

    // Post to #general channel
    const systemUser = await getSystemUserId();
    if (systemUser) {
      await autoPostToChannel("general", digestMessage, systemUser, "SYSTEM");
    }

    return NextResponse.json({
      ok: true,
      stats: {
        newLeads: newLeads.length,
        leadValue,
        tasksDueToday: tasksDueToday.length,
        overdueInvoices: overdueInvoices.length,
        paidInvoices: paidInvoices._count,
        managersNotified: managers.length,
      },
    });
  } catch (err) {
    console.error("[cron/daily-digest]", err);
    return NextResponse.json({ error: "Digest generation failed" }, { status: 500 });
  }
}
