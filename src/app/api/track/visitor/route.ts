import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("track-visitor", req, { limit: 100, windowSec: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: corsHeaders });
    }

    const body = await req.json();
    const { apiKey, sessionId, page, referrer, device, browser } = body;

    if (!apiKey || !sessionId || !page) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const site = await prisma.trackedSite.findUnique({ where: { apiKey } });
    if (!site) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: corsHeaders });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;

    await prisma.pageView.create({
      data: {
        siteId: site.id,
        sessionId,
        page,
        referrer: referrer || null,
        device: device || null,
        browser: browser || null,
        ip,
        duration: body.duration || null,
        country: body.country || null,
        city: body.city || null,
      },
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[track/visitor]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: corsHeaders });
  }
}
