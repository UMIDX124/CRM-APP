import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    const range = url.searchParams.get("range") || "30d";

    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where = {
      createdAt: { gte: since },
      ...(siteId ? { siteId } : {}),
    };

    const [totalVisitors, allViews, topPages, deviceSplit, referrerBreakdown, dailyViews, leadCount] =
      await Promise.all([
        prisma.pageView.count({ where }),
        prisma.pageView.findMany({
          where,
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.pageView.groupBy({
          by: ["page"],
          where,
          _count: { id: true },
          _avg: { duration: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        prisma.pageView.groupBy({
          by: ["device"],
          where,
          _count: { id: true },
        }),
        prisma.pageView.groupBy({
          by: ["referrer"],
          where: { ...where, referrer: { not: null, not: "" } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
          `SELECT DATE(created_at) as date, COUNT(*) as count
           FROM page_views
           WHERE created_at >= $1 ${siteId ? "AND site_id = $2" : ""}
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          ...(siteId ? [since, siteId] : [since])
        ),
        prisma.webLead.count({ where: { createdAt: { gte: since }, ...(siteId ? { siteId } : {}) } }),
      ]);

    const uniqueSessions = allViews.length;
    const conversionRate = totalVisitors > 0 ? ((leadCount / uniqueSessions) * 100).toFixed(1) : "0";

    return NextResponse.json({
      totalVisitors,
      uniqueSessions,
      leadCount,
      conversionRate,
      topPages: topPages.map((p) => ({
        page: p.page,
        views: p._count.id,
        avgDuration: Math.round(p._avg.duration || 0),
      })),
      deviceSplit: deviceSplit.map((d) => ({
        device: d.device || "unknown",
        count: d._count.id,
      })),
      referrerBreakdown: referrerBreakdown.map((r) => ({
        referrer: r.referrer || "direct",
        count: r._count.id,
      })),
      dailyViews: dailyViews.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[analytics] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
