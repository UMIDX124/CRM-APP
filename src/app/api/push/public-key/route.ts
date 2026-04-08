import { NextResponse } from "next/server";

/**
 * GET /api/push/public-key
 * Returns the VAPID public key so the browser can subscribe.
 * No auth — public by design.
 */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications not configured on this server" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
