import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiGenerate } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("ai-proposal", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit: 10 requests per minute" }, { status: 429 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success || (!parsed.data.leadId && !parsed.data.dealId)) {
      return NextResponse.json(
        { error: "leadId or dealId is required" },
        { status: 400 }
      );
    }

    let contextLines: string[] = [];
    let subject = "Services Proposal";

    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, ...tenantWhere(user) },
        include: { brand: { select: { code: true, name: true } } },
      });
      if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      subject = `${lead.companyName || lead.contactName} — Services Proposal`;
      contextLines = [
        `Prospect: ${lead.contactName}`,
        lead.companyName ? `Company: ${lead.companyName}` : null,
        lead.email ? `Email: ${lead.email}` : null,
        lead.country ? `Country: ${lead.country}` : null,
        lead.services && lead.services.length > 0 ? `Services of interest: ${lead.services.join(", ")}` : null,
        lead.value ? `Lead value: $${lead.value.toFixed(2)}` : null,
        lead.source ? `Source: ${lead.source}` : null,
        `Status: ${lead.status}`,
        lead.brand ? `Selling under brand: ${lead.brand.name}` : null,
        lead.notes ? `Notes: ${lead.notes}` : null,
      ].filter((x): x is string => Boolean(x));
    } else if (parsed.data.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: parsed.data.dealId, ...tenantWhere(user) },
        include: {
          client: { select: { companyName: true, contactName: true, email: true } },
          brand: { select: { name: true } },
        },
      });
      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      subject = `${deal.title} — Proposal`;
      contextLines = [
        `Deal: ${deal.title}`,
        `Value: $${deal.value.toFixed(2)}`,
        `Stage: ${deal.stage}`,
        deal.client ? `Client: ${deal.client.companyName} — ${deal.client.contactName}` : null,
        deal.brand ? `Brand: ${deal.brand.name}` : null,
        deal.description || null,
      ].filter((x): x is string => Boolean(x));
    }

    if (parsed.data.notes) contextLines.push(`\nAdditional notes from account manager:\n${parsed.data.notes}`);

    const system = `You are a senior solutions consultant writing a professional services proposal in markdown. Structure:

# Proposal: <Title>

## Overview
One paragraph summarizing the prospect's situation and the value you'll deliver.

## Scope of Work
3–5 bullet points of specific deliverables.

## Timeline
A short phased plan (Week 1–2, Week 3–4, etc.).

## Investment
A pricing line and what's included.

## Next Steps
Two concrete next actions.

Be concrete and concise. No filler corporate jargon. Reference actual details from the prospect data. Plain markdown — no tables, no images.`;

    const prompt = `Prospect context:\n${contextLines.join("\n")}\n\nGenerate the proposal now.`;

    const result = await aiGenerate({ system, prompt, temperature: 0.75, maxTokens: 1600 });

    return NextResponse.json({
      subject,
      markdown: result.text.trim(),
      model: result.model,
      attempts: result.attempts,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai.proposal] error:", msg);
    const code = (e as { code?: string })?.code;
    const status = msg === "Unauthorized" ? 401 : code === "AI_NOT_CONFIGURED" ? 503 : 500;
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : code === "AI_NOT_CONFIGURED"
          ? "AI features are not configured on this deployment"
          : "Failed to generate proposal";
    return NextResponse.json({ error: safe }, { status });
  }
}
