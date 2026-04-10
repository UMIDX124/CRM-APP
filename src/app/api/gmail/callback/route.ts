import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/gmail";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");

    if (!code || !userId) {
      return NextResponse.redirect(new URL("/settings?gmail=error&reason=missing_params", req.url));
    }

    await handleCallback(code, userId);

    return NextResponse.redirect(new URL("/settings?gmail=connected", req.url));
  } catch (error) {
    console.error("[gmail/callback]", error);
    return NextResponse.redirect(new URL("/settings?gmail=error&reason=oauth_failed", req.url));
  }
}
