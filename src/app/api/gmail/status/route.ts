import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getGmailStatus } from "@/lib/gmail";

export async function GET() {
  try {
    const user = await requireAuth();
    const status = await getGmailStatus(user.id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[gmail/status]", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
