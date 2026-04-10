import { NextResponse } from "next/server";
import { validateMagicLink } from "@/lib/portal-auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/portal/login?error=missing_token", req.url));
    }

    const client = await validateMagicLink(token);

    if (!client) {
      return NextResponse.redirect(new URL("/portal/login?error=invalid_or_expired", req.url));
    }

    return NextResponse.redirect(new URL("/portal/dashboard", req.url));
  } catch (error) {
    console.error("[portal/verify]", error);
    return NextResponse.redirect(new URL("/portal/login?error=server_error", req.url));
  }
}
