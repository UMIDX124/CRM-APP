import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";

/**
 * GET /api/dashboard/revenue
 *
 * Returns PAID invoice totals bucketed by (year-month, brand code) for
 * the last N months (default 6). Shape:
 *
 *   [
 *     { month: "Nov 2025", vcs: 42000, bsl: 28000, dpl: 22000 },
 *     { month: "Dec 2025", vcs: 45000, bsl: 32000, dpl: 25000 },
 *     ...
 *   ]
 *
 * Months without any PAID invoices for a brand show 0 so the chart's
 * x-axis is contiguous even for brands that launched mid-period. Amounts
 * are returned as numbers (USD). Brand keys match the 3-letter codes.
 *
 * Tenant-scoped: caller only ever sees revenue from brands within their
 * own company (or their own brand for non-managers).
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const monthsRaw = parseInt(url.searchParams.get("months") || "6", 10);
    const months = Number.isFinite(monthsRaw) && monthsRaw > 0 && monthsRaw <= 24
      ? monthsRaw
      : 6;

    // Compute the first day of the earliest month in the window so
    // invoices issued anywhere in that month are included.
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1
    );

    const invoices = await prisma.invoice.findMany({
      where: {
        ...tenantWhere(user),
        status: "PAID",
        // Use paidDate when available (accurate revenue recognition),
        // fall back to issueDate for legacy rows without one.
        OR: [
          { paidDate: { gte: windowStart } },
          { paidDate: null, issueDate: { gte: windowStart } },
        ],
      },
      select: {
        total: true,
        paidDate: true,
        issueDate: true,
        brand: { select: { code: true } },
      },
    });

    // Bucket on client side so we don't depend on SQL date_trunc which
    // Prisma doesn't expose through the query builder.
    const buckets = new Map<string, Record<string, number>>();
    // Seed all N months with zeros so missing months still render.
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, {});
    }

    const brandCodes = new Set<string>();
    for (const inv of invoices) {
      const dt = inv.paidDate ?? inv.issueDate;
      if (!dt) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue; // outside window (shouldn't happen with our where)
      const code = (inv.brand?.code || "UNKNOWN").toLowerCase();
      brandCodes.add(code);
      bucket[code] = (bucket[code] || 0) + (inv.total || 0);
    }

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const data = Array.from(buckets.entries()).map(([key, bucket]) => {
      const [y, m] = key.split("-").map((s) => parseInt(s, 10));
      const row: Record<string, string | number> = {
        month: `${monthNames[m - 1]} ${y}`,
      };
      // Fill missing brand codes with 0 so every row has the same shape.
      for (const code of brandCodes) {
        row[code] = bucket[code] || 0;
      }
      return row;
    });

    return NextResponse.json({
      months: data,
      brands: Array.from(brandCodes).sort(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Revenue chart API error:", err);
    return NextResponse.json(
      {
        error: "Revenue query failed",
        code: "REVENUE_QUERY_FAILED",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
