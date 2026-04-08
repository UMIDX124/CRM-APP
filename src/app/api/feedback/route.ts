import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

function unauthorized(e: unknown) {
  if (e instanceof Error && e.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const clientId = url.searchParams.get("clientId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const feedback = await prisma.customerFeedback.findMany({
      where,
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(feedback);
  } catch (err) {
    const u = unauthorized(err); if (u) return u;
    console.error("Feedback GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("feedback", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = await req.json();
    if (!body.clientId || !body.message || !body.type) {
      return NextResponse.json({ error: "clientId, message, and type are required" }, { status: 400 });
    }

    const feedback = await prisma.customerFeedback.create({
      data: {
        clientId: body.clientId,
        type: body.type,
        message: body.message,
        status: "OPEN",
      },
      include: { client: { select: { id: true, companyName: true } } },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
