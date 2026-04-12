import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiGenerate, extractJson } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const schema = z.object({
  subject: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
});

interface Classification {
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: "BUG" | "FEATURE_REQUEST" | "BILLING" | "SUPPORT" | "OTHER";
  confidence: number;
  reasoning: string;
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("ai-ticket-classify", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit: 20 requests per minute" }, { status: 429 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const system = `You are a support triage specialist. Classify the following support ticket into JSON only (no markdown, no code fences):

{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "category": "BUG" | "FEATURE_REQUEST" | "BILLING" | "SUPPORT" | "OTHER",
  "confidence": <0.0 to 1.0>,
  "reasoning": "one sentence"
}

Priority guide:
- URGENT: production down, data loss, security breach, payment failure blocking work
- HIGH: blocking workflow, affecting multiple users
- MEDIUM: impacting one user but with workaround, billing questions
- LOW: cosmetic, feature requests, minor inconveniences

Return JSON only.`;

    const prompt = `Subject: ${parsed.data.subject}\n\n${parsed.data.description ? `Description:\n${parsed.data.description}` : "(no description)"}`;

    let classification: Classification | null = null;
    try {
      const result = await aiGenerate({ system, prompt, temperature: 0.2, maxTokens: 300 });
      classification = extractJson<Classification>(result.text);
    } catch (err) {
      console.error("[ai.ticket-classify] groq failed:", err);
    }

    // Fallback: keyword heuristic if the model fails or returns garbage
    if (!classification) {
      const text = `${parsed.data.subject} ${parsed.data.description || ""}`.toLowerCase();
      const urgent = /down|outage|crash|breach|payment failed|critical|urgent/.test(text);
      const high = /blocked|cannot|broken|error|fail|bug/.test(text);
      const billing = /invoice|payment|charge|refund|billing|subscription/.test(text);
      const feature = /feature request|would be nice|wish|could you add|suggestion/.test(text);
      classification = {
        priority: urgent ? "URGENT" : high ? "HIGH" : "MEDIUM",
        category: billing ? "BILLING" : feature ? "FEATURE_REQUEST" : high ? "BUG" : "SUPPORT",
        confidence: 0.5,
        reasoning: "Fallback keyword heuristic — AI model unavailable",
      };
    }

    // Normalize
    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(classification.priority)) {
      classification.priority = "MEDIUM";
    }
    if (!["BUG", "FEATURE_REQUEST", "BILLING", "SUPPORT", "OTHER"].includes(classification.category)) {
      classification.category = "SUPPORT";
    }
    classification.confidence = Math.max(0, Math.min(1, Number(classification.confidence) || 0.5));

    return NextResponse.json(classification);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai.ticket-classify] error:", msg);
    const code = (e as { code?: string })?.code;
    const status = msg === "Unauthorized" ? 401 : code === "AI_NOT_CONFIGURED" ? 503 : 500;
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : code === "AI_NOT_CONFIGURED"
          ? "AI features are not configured"
          : "Failed to classify ticket";
    return NextResponse.json({ error: safe }, { status });
  }
}
