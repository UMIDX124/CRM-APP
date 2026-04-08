import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

/**
 * GET /api/employees/search?q=<prefix>
 *
 * Lightweight employee search used by the chat @-mention autocomplete.
 * Returns at most 8 active employees whose firstName OR lastName starts
 * with the query (case-insensitive).
 *
 * Shape matches what UnifiedChat's mention dropdown actually reads
 * (id/firstName/lastName/title/brand), nothing else. Avoids pulling
 * the full employee list into every browser just to filter locally —
 * which was the old behavior before this endpoint existed.
 *
 * Rate limit: 30 req/min/user. The client throttles by only firing on
 * `@` token changes, but a pathological paste-loop could still flood it.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const rl = await rateLimit("employees-search", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    // Empty query → return the top 8 alphabetically. Lets the dropdown
    // open immediately when the user types just "@" with no letters yet.
    const where = q
      ? {
          status: "ACTIVE" as const,
          OR: [
            { firstName: { startsWith: q, mode: "insensitive" as const } },
            { lastName: { startsWith: q, mode: "insensitive" as const } },
          ],
        }
      : { status: "ACTIVE" as const };

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        brand: { select: { code: true, color: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 8,
    });

    return NextResponse.json(employees);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[employees/search] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
