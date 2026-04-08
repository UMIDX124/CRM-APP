import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/presence/heartbeat
 *
 * Called by every authenticated client every ~30s while the tab is focused
 * (and once on mount). Bumps `User.lastSeenAt` so the SSE presence poll
 * can derive online/away/offline status.
 *
 * No rate limit — heartbeats are part of the contract. We do guard against
 * abuse by requiring auth and only updating one field.
 */
export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), presenceStatus: "online" },
    });
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err) {
    console.error("[presence] heartbeat failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
