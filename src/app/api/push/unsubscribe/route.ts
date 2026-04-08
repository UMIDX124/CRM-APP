import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/push/unsubscribe  { endpoint: string }
 *
 * Removes a PushSubscription row by endpoint (unique). Used when the user
 * toggles notifications off, clears site data, or the service worker
 * detects a permission revocation and proactively cleans up.
 *
 * Only deletes subscriptions owned by the current session — a user cannot
 * unsubscribe someone else even if they know the endpoint.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
    return NextResponse.json({ removed: result.count });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
