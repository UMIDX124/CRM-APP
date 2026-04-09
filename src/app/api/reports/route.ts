import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere, tenantUserWhere } from "@/lib/auth";

/**
 * GET /api/reports
 *
 * Returns every aggregated payload the Reports module needs in a single
 * round-trip so the page renders in one fetch instead of five. All
 * aggregations are tenant-scoped.
 *
 * Shape:
 *   {
 *     summary: { totalRevenue, revenueGrowth, totalClients, totalEmployees,
 *                tasksCompleted, tasksTotal },
 *     revenue:   [{ month: "Nov 2025", vcs: 42000, ... }, ...]  (6 months)
 *     brands:    [{ name, code, revenue, color }, ...]
 *     topClients:[{ name, mrr, status }, ...]                   (top 5)
 *     topEmployees:[{ name, department, score }, ...]           (top 5)
 *     tasks:     [{ status: "TODO", count: 3 }, ...]
 *   }
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const tenant = tenantWhere(user);
    const userTenant = tenantUserWhere(user);

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      allPaidInvoices,
      allClients,
      topClients,
      topEmployees,
      allTasks,
      allBrands,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...tenant,
          status: "PAID",
          OR: [
            { paidDate: { gte: sixMonthsAgo } },
            { paidDate: null, issueDate: { gte: sixMonthsAgo } },
          ],
        },
        select: {
          total: true,
          paidDate: true,
          issueDate: true,
          brand: { select: { code: true, name: true } },
        },
      }),
      prisma.client.count({ where: tenant }),
      prisma.client.findMany({
        where: tenant,
        select: { companyName: true, mrr: true, healthScore: true },
        orderBy: { mrr: "desc" },
        take: 5,
      }),
      prisma.user.findMany({
        where: { ...userTenant, status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          _count: { select: { assignedTasks: true } },
        },
        take: 50,
      }),
      prisma.task.findMany({
        where: tenant,
        select: { status: true },
      }),
      prisma.brand.findMany({
        where:
          user.role === "SUPER_ADMIN"
            ? {}
            : user.role === "PROJECT_MANAGER" || user.role === "DEPT_HEAD"
              ? { companyId: user.companyId ?? "__none__" }
              : { id: user.brandId ?? "__none__" },
        select: { code: true, name: true, color: true },
      }),
    ]);

    const totalEmployees = topEmployees.length;

    // --- Revenue grouped by (month, brand) ---------------------------
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthKeys: string[] = [];
    const monthBuckets = new Map<string, Record<string, number>>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
      monthBuckets.set(key, {});
    }

    for (const inv of allPaidInvoices) {
      const dt = inv.paidDate ?? inv.issueDate;
      if (!dt) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthBuckets.get(key);
      if (!bucket) continue;
      const code = (inv.brand?.code || "UNKNOWN").toLowerCase();
      bucket[code] = (bucket[code] || 0) + (inv.total || 0);
    }

    const revenue = monthKeys.map((key) => {
      const [y, m] = key.split("-").map((s) => parseInt(s, 10));
      const bucket = monthBuckets.get(key) || {};
      const row: Record<string, string | number> = {
        month: `${monthNames[m - 1]} ${y}`,
      };
      for (const brand of allBrands) {
        row[brand.code.toLowerCase()] = bucket[brand.code.toLowerCase()] || 0;
      }
      return row;
    });

    // --- Totals + growth ---------------------------------------------
    const sumMonth = (row: Record<string, string | number>): number => {
      let s = 0;
      for (const k of Object.keys(row)) {
        if (k !== "month") s += Number(row[k] || 0);
      }
      return s;
    };
    const latestTotal = revenue.length > 0 ? sumMonth(revenue[revenue.length - 1]) : 0;
    const prevTotal = revenue.length > 1 ? sumMonth(revenue[revenue.length - 2]) : 0;
    const revenueGrowth =
      prevTotal > 0 ? Math.round(((latestTotal - prevTotal) / prevTotal) * 100) : 0;

    // --- Per-brand total in the window -------------------------------
    const brands = allBrands.map((b) => {
      const code = b.code.toLowerCase();
      let total = 0;
      for (const row of revenue) total += Number(row[code] || 0);
      return { name: b.name, code: b.code, revenue: total, color: b.color };
    });

    // --- Task status counts ------------------------------------------
    const taskCounts = new Map<string, number>();
    for (const t of allTasks) {
      taskCounts.set(t.status, (taskCounts.get(t.status) || 0) + 1);
    }
    const tasks = Array.from(taskCounts.entries()).map(([status, count]) => ({
      status,
      count,
    }));
    const tasksTotal = allTasks.length;
    const tasksCompleted = taskCounts.get("COMPLETED") || 0;

    // --- Top employees by task throughput ----------------------------
    const employeesRanked = topEmployees
      .map((e) => ({
        name: `${e.firstName} ${e.lastName}`.trim(),
        department: e.department || "—",
        score: e._count.assignedTasks,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalRevenue: latestTotal,
        revenueGrowth,
        totalClients: allClients,
        totalEmployees,
        tasksCompleted,
        tasksTotal,
      },
      revenue,
      brands,
      topClients: topClients.map((c) => ({
        name: c.companyName,
        mrr: c.mrr,
        status: c.healthScore >= 70 ? "Healthy" : c.healthScore >= 40 ? "At Risk" : "Critical",
      })),
      topEmployees: employeesRanked,
      tasks,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Reports API error:", err);
    return NextResponse.json(
      {
        error: "Reports query failed",
        code: "REPORTS_QUERY_FAILED",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
