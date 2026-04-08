import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/push/subscribe   — register a browser PushSubscription
 * DELETE /api/push/subscribe — unregister by endpoint
 *
 * Body for POST: { endpoint, keys: { p256dh, auth } } (the JSON shape
 * returned by `subscription.toJSON()` in the browser).
 */
export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "endpoint + keys.p256dh + keys.auth are required" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || null;

    // Upsert by endpoint — if a different user previously had this endpoint
    // (rare, e.g. shared device), we reassign it.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth, userAgent },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!endpoint) {
      // Without an endpoint, remove all subs for this user (logout-style)
      await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ ok: true, mode: "all" });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
