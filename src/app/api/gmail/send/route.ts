import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/gmail";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const rl = await rateLimit("gmail-send", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { to, subject, body, threadId } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }

    const result = await sendEmail(user.id, to, subject, body, threadId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Gmail not connected") return NextResponse.json({ error: message, code: "GMAIL_NOT_CONNECTED" }, { status: 403 });
    console.error("[gmail/send]", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
