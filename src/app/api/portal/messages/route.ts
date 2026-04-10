import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portal-auth";
import { rateLimit } from "@/lib/ratelimit";

export async function GET(req: Request) {
  try {
    const client = await requirePortalAuth();

    const messages = await prisma.portalMessage.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json(messages);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "PortalUnauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[portal/messages GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const client = await requirePortalAuth();

    const rl = await rateLimit("portal-msg", req, { limit: 30, windowSec: 60 });
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const msg = await prisma.portalMessage.create({
      data: {
        clientId: client.id,
        sender: "client",
        message: message.trim(),
      },
    });

    return NextResponse.json(msg, { status: 201 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal error";
    if (errMsg === "PortalUnauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[portal/messages POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
