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

async function scoreLead(data: { name?: string; email?: string; message?: string; page?: string }): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "unscored";

  try {
    const { createGroq } = await import("@ai-sdk/groq");
    const { generateText } = await import("ai");

    const groq = createGroq({ apiKey });
    const model = groq(process.env.GROQ_MODEL || "llama-3.3-70b-versatile");

    const { text } = await generateText({
      model,
      maxOutputTokens: 10,
      prompt: `Score this website lead as exactly one word: "hot", "warm", or "cold".

Name: ${data.name || "unknown"}
Email: ${data.email || "none"}
Message: ${data.message || "none"}
Page: ${data.page || "/"}

Rules:
- hot: has email AND message with clear intent (pricing, demo, consultation)
- warm: has email OR shows moderate interest
- cold: minimal info or generic inquiry

Reply with ONLY one word: hot, warm, or cold.`,
    });

    const score = text.trim().toLowerCase();
    if (["hot", "warm", "cold"].includes(score)) return score;
    return "warm";
  } catch {
    return "unscored";
  }
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("track-lead", req, { limit: 20, windowSec: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: corsHeaders });
    }

    const body = await req.json();
    const { apiKey, name, email, phone, message, page, source } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing apiKey" }, { status: 400, headers: corsHeaders });
    }

    const site = await prisma.trackedSite.findUnique({ where: { apiKey } });
    if (!site) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: corsHeaders });
    }

    const aiScore = await scoreLead({ name, email, message, page });

    const lead = await prisma.webLead.create({
      data: {
        siteId: site.id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        message: message || null,
        page: page || null,
        source: source || null,
        aiScore,
        status: "new",
      },
    });

    return NextResponse.json({ ok: true, id: lead.id, aiScore }, { headers: corsHeaders });
  } catch (error) {
    console.error("[track/lead]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: corsHeaders });
  }
}
