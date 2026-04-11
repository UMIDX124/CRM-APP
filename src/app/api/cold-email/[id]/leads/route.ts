import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { z } from "zod";

// GET — paginated leads for a campaign
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rl = await rateLimit("cold-email-leads", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const statusFilter = url.searchParams.get("status");
    const skip = (page - 1) * limit;

    // Verify campaign access
    const where: Record<string, unknown> = { id };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }
    const campaign = await prisma.emailCampaign.findFirst({ where, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const leadWhere: Record<string, unknown> = { campaignId: id };
    if (statusFilter) leadWhere.status = statusFilter;

    const [leads, total] = await Promise.all([
      prisma.campaignLead.findMany({
        where: leadWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          currentStep: true,
          nextSendAt: true,
          generatedSubject: true,
          generatedEmail: true,
          createdAt: true,
          updatedAt: true,
          prospect: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              company: true,
              niche: true,
              city: true,
              emailStatus: true,
              website: true,
              googleRating: true,
              reviewCount: true,
            },
          },
        },
      }),
      prisma.campaignLead.count({ where: leadWhere }),
    ]);

    return NextResponse.json({ leads, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/cold-email/[id]/leads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const addLeadsSchema = z.object({
  prospectIds: z.array(z.string()).min(1).max(500),
});

// POST — add prospects to campaign
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rl = await rateLimit("cold-email-add-leads", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const where: Record<string, unknown> = { id };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }
    const campaign = await prisma.emailCampaign.findFirst({ where, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = await req.json();
    const parsed = addLeadsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    // Filter out unsubscribed prospects
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: parsed.data.prospectIds },
        unsubscribed: false,
      },
      select: { id: true },
    });

    // Find already-added prospects
    const existing = await prisma.campaignLead.findMany({
      where: {
        campaignId: id,
        prospectId: { in: prospects.map((p) => p.id) },
      },
      select: { prospectId: true },
    });
    const existingIds = new Set(existing.map((e) => e.prospectId));

    const newProspectIds = prospects.map((p) => p.id).filter((pid) => !existingIds.has(pid));

    if (newProspectIds.length > 0) {
      await prisma.campaignLead.createMany({
        data: newProspectIds.map((prospectId) => ({
          campaignId: id,
          prospectId,
        })),
      });

      // Update campaign prospect count
      await prisma.emailCampaign.update({
        where: { id },
        data: { totalProspects: { increment: newProspectIds.length } },
      });
    }

    return NextResponse.json({
      added: newProspectIds.length,
      skippedDuplicate: existingIds.size,
      skippedUnsubscribed: parsed.data.prospectIds.length - prospects.length,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/cold-email/[id]/leads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const removeLeadsSchema = z.object({
  leadIds: z.array(z.string()).min(1).max(500),
});

// DELETE — remove leads from campaign
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const where: Record<string, unknown> = { id };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }
    const campaign = await prisma.emailCampaign.findFirst({ where, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = await req.json();
    const parsed = removeLeadsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await prisma.campaignLead.deleteMany({
      where: {
        id: { in: parsed.data.leadIds },
        campaignId: id,
      },
    });

    if (result.count > 0) {
      await prisma.emailCampaign.update({
        where: { id },
        data: { totalProspects: { decrement: result.count } },
      });
    }

    return NextResponse.json({ removed: result.count });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/cold-email/[id]/leads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
