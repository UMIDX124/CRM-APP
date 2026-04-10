import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/gmail";

export async function POST() {
  try {
    const user = await requireAuth();
    const url = getAuthUrl(user.id);
    return NextResponse.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[gmail/connect]", error);
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 });
  }
}
