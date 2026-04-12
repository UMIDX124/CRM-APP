import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiGenerate, extractJson } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface LlmResponse {
  low: number;
  expected: number;
  high: number;
  rationale: string;
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("ai-revenue-forecast", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit: 10 requests per minute" }, { status: 429 });
    }

    const scope = tenantWhere(user);

    // Gather pipeline inputs — deals not yet won/lost, historical win rates,
    // current MRR, and deal ages.
    const [openDeals, wonDeals, lostDeals, activeClients, mrrAgg] = await Promise.all([
      prisma.deal.findMany({
        where: { ...scope, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
        select: { id: true, title: true, value: true, stage: true, createdAt: true, updatedAt: true, expectedClose: true },
        take: 200,
      }),
      prisma.deal.findMany({
        where: { ...scope, stage: "CLOSED_WON" },
        select: { value: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.deal.findMany({
        where: { ...scope, stage: "CLOSED_LOST" },
        select: { value: true },
        take: 100,
      }),
      prisma.client.count({ where: { ...scope, status: "ACTIVE" } }),
      prisma.client.aggregate({ where: { ...scope, status: "ACTIVE" }, _sum: { mrr: true } }),
    ]);

    const totalOpenDealsValue = openDeals.reduce((s, d) => s + d.value, 0);
    const totalWonValue = wonDeals.reduce((s, d) => s + d.value, 0);
    const winRate =
      wonDeals.length + lostDeals.length > 0
        ? wonDeals.length / (wonDeals.length + lostDeals.length)
        : 0.2;
    const currentMRR = mrrAgg._sum.mrr ?? 0;

    const system = `You are a financial forecasting analyst. Given pipeline data, produce a 90-day revenue forecast as JSON only:

{
  "low": <number>,
  "expected": <number>,
  "high": <number>,
  "rationale": "1-3 sentence explanation"
}

Rules:
- All numbers are USD dollars (no commas, no currency symbols)
- low < expected < high
- Be conservative on uncertainty — weight open deals by win rate
- Include recurring MRR × 3 months as the base
- Return JSON only. No markdown, no code fences.`;

    const prompt = `Pipeline snapshot:
Open deals: ${openDeals.length} (total pipeline: $${totalOpenDealsValue.toFixed(0)})
Closed/won in history: ${wonDeals.length} (total: $${totalWonValue.toFixed(0)})
Closed/lost in history: ${lostDeals.length}
Historical win rate: ${(winRate * 100).toFixed(1)}%
Active clients: ${activeClients}
Current MRR: $${currentMRR.toFixed(0)}

Stage breakdown of open deals:
${openDeals
  .slice(0, 20)
  .map((d) => `- ${d.stage}: $${d.value.toFixed(0)} — "${d.title}"`)
  .join("\n")}

Produce the 90-day forecast JSON now.`;

    let forecast: LlmResponse | null = null;
    try {
      const result = await aiGenerate({ system, prompt, temperature: 0.4, maxTokens: 400 });
      forecast = extractJson<LlmResponse>(result.text);
    } catch (err) {
      console.error("[ai.revenue-forecast] groq failed, using baseline:", err);
    }

    // Fallback: deterministic baseline if the model output is unusable
    if (!forecast || typeof forecast.expected !== "number") {
      const baseline = currentMRR * 3;
      const pipelineValue = totalOpenDealsValue * winRate;
      const expected = Math.round(baseline + pipelineValue);
      forecast = {
        low: Math.round(expected * 0.7),
        expected,
        high: Math.round(expected * 1.3),
        rationale: `Baseline: $${currentMRR.toFixed(0)} MRR × 3 months + pipeline ($${totalOpenDealsValue.toFixed(0)}) weighted by ${(winRate * 100).toFixed(0)}% win rate.`,
      };
    } else {
      // Clamp sanity
      forecast.low = Math.max(0, Math.round(forecast.low));
      forecast.expected = Math.max(forecast.low, Math.round(forecast.expected));
      forecast.high = Math.max(forecast.expected, Math.round(forecast.high));
    }

    return NextResponse.json({
      ...forecast,
      inputs: {
        openDealsCount: openDeals.length,
        openPipelineValue: totalOpenDealsValue,
        winRate,
        currentMRR,
        activeClients,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai.revenue-forecast] error:", msg);
    const code = (e as { code?: string })?.code;
    const status = msg === "Unauthorized" ? 401 : code === "AI_NOT_CONFIGURED" ? 503 : 500;
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : code === "AI_NOT_CONFIGURED"
          ? "AI features are not configured on this deployment"
          : "Failed to generate forecast";
    return NextResponse.json({ error: safe }, { status });
  }
}
