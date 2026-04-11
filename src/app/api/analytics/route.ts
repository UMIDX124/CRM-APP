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

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (siteId) where.siteId = siteId;

    // Run all queries in parallel — each is individually safe
    const [
      totalVisitors,
      allViews,
      topPages,
      deviceSplit,
      referrerBreakdown,
      leadCount,
    ] = await Promise.all([
      prisma.pageView.count({ where }).catch(() => 0),

      prisma.pageView
        .findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] })
        .catch(() => []),

      prisma.pageView
        .groupBy({
          by: ["page"],
          where,
          _count: { id: true },
          _avg: { duration: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        })
        .catch(() => []),

      prisma.pageView
        .groupBy({
          by: ["device"],
          where,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        })
        .catch(() => []),

      prisma.pageView
        .groupBy({
          by: ["referrer"],
          where: {
            ...where,
            referrer: { not: "" },
            NOT: { referrer: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        })
        .catch(() => []),

      prisma.webLead
        .count({ where: { createdAt: { gte: since }, ...(siteId ? { siteId } : {}) } })
        .catch(() => 0),
    ]);

    // Daily views via raw SQL — handles the DATE() aggregation Prisma can't do
    let dailyViews: { date: string; count: number }[] = [];
    try {
      const params: unknown[] = [since];
      let sql = `SELECT DATE(created_at) as date, COUNT(*)::int as count FROM page_views WHERE created_at >= $1`;
      if (siteId) {
        sql += ` AND site_id = $2`;
        params.push(siteId);
      }
      sql += ` GROUP BY DATE(created_at) ORDER BY date ASC`;

      const raw = await prisma.$queryRawUnsafe<{ date: string; count: number | bigint }[]>(sql, ...params);
      dailyViews = raw.map((r) => ({ date: String(r.date), count: Number(r.count) }));
    } catch (e) {
      console.error("[analytics] dailyViews raw query failed:", e instanceof Error ? e.message : e);
    }

    const uniqueSessions = allViews.length;
    const conversionRate =
      uniqueSessions > 0 ? ((leadCount / uniqueSessions) * 100).toFixed(1) : "0";

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
      // Deduplicate after normalization to prevent React duplicate key errors
      deviceSplit: (() => {
        const map = new Map<string, number>();
        for (const d of deviceSplit) {
          const key = d.device || "unknown";
          map.set(key, (map.get(key) || 0) + d._count.id);
        }
        return Array.from(map, ([device, count]) => ({ device, count }));
      })(),
      referrerBreakdown: (() => {
        const map = new Map<string, number>();
        for (const r of referrerBreakdown) {
          const key = r.referrer || "direct";
          map.set(key, (map.get(key) || 0) + r._count.id);
        }
        return Array.from(map, ([referrer, count]) => ({ referrer, count }));
      })(),
      dailyViews,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[analytics] FATAL:", message, stack);
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error", detail: message }, { status: 500 });
  }
}
