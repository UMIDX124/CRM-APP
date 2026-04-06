import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source"); // DPL, VCS, BSL, or null for all
    const days = parseInt(url.searchParams.get("days") || "30");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = {
      createdAt: { gte: since },
    };
    if (source) {
      where.source = { contains: source, mode: "insensitive" };
    }

    // Get all leads matching filters
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        status: true,
        value: true,
        probability: true,
        source: true,
        brandId: true,
        createdAt: true,
        notes: true,
        brand: { select: { code: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute funnel stages
    const stages = {
      NEW: leads.filter(l => l.status === "NEW"),
      QUALIFIED: leads.filter(l => l.status === "QUALIFIED"),
      PROPOSAL_SENT: leads.filter(l => l.status === "PROPOSAL_SENT"),
      NEGOTIATION: leads.filter(l => l.status === "NEGOTIATION"),
      WON: leads.filter(l => l.status === "WON"),
      LOST: leads.filter(l => l.status === "LOST"),
    };

    const stageValue = (list: typeof leads) => list.reduce((sum, l) => sum + (l.value || 0), 0);

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source?.split(" - ")[1] || l.source?.split(" - ")[0] || "Direct";
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    });

    // Form type breakdown (extracted from source string)
    const formBreakdown: Record<string, number> = {};
    leads.forEach(l => {
      const form = l.source?.split(" - ")[0] || "Website";
      formBreakdown[form] = (formBreakdown[form] || 0) + 1;
    });

    return NextResponse.json({
      total: leads.length,
      funnel: [
        { stage: "New", count: stages.NEW.length, value: stageValue(stages.NEW), color: "#3B82F6" },
        { stage: "Qualified", count: stages.QUALIFIED.length, value: stageValue(stages.QUALIFIED), color: "#06B6D4" },
        { stage: "Proposal", count: stages.PROPOSAL_SENT.length, value: stageValue(stages.PROPOSAL_SENT), color: "#F59E0B" },
        { stage: "Negotiation", count: stages.NEGOTIATION.length, value: stageValue(stages.NEGOTIATION), color: "#6366F1" },
        { stage: "Won", count: stages.WON.length, value: stageValue(stages.WON), color: "#10B981" },
        { stage: "Lost", count: stages.LOST.length, value: stageValue(stages.LOST), color: "#EF4444" },
      ],
      leads: leads.map(l => ({
        id: l.id,
        companyName: l.companyName,
        contactName: l.contactName,
        email: l.email,
        status: l.status,
        value: l.value,
        score: l.probability,
        source: l.source,
        brand: l.brand?.code || null,
        brandColor: l.brand?.color || null,
        createdAt: l.createdAt,
        notes: l.notes,
      })),
      sourceBreakdown: Object.entries(sourceBreakdown).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      formBreakdown: Object.entries(formBreakdown).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      metrics: {
        totalValue: stageValue(leads),
        wonValue: stageValue(stages.WON),
        avgScore: leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.probability || 0), 0) / leads.length) : 0,
        conversionRate: leads.length > 0 ? Math.round((stages.WON.length / leads.length) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("Funnel API error:", err);
    return NextResponse.json({ error: "Failed to load funnel data" }, { status: 500 });
  }
}
