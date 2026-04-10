import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getThreads } from "@/lib/gmail";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const clientEmail = url.searchParams.get("clientEmail");
    const query = url.searchParams.get("q");

    if (!clientEmail && !query) {
      return NextResponse.json({ error: "clientEmail or q parameter required" }, { status: 400 });
    }

    const searchQuery = query || `from:${clientEmail} OR to:${clientEmail}`;
    const threads = await getThreads(user.id, searchQuery);

    return NextResponse.json({ threads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Gmail not connected") return NextResponse.json({ error: message, code: "GMAIL_NOT_CONNECTED" }, { status: 403 });
    console.error("[gmail/threads]", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}
