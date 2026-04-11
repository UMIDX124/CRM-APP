import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { generateEmail } from "@/lib/cold-email/generator";

export const maxDuration = 60;

// POST — batch-generate AI emails for queued leads in a campaign
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rl = await rateLimit("cold-email-generate", req, { limit: 10, windowSec: 300 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Verify campaign access
    const where: Record<string, unknown> = { id };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }
    const campaign = await prisma.emailCampaign.findFirst({
      where,
      select: { id: true, systemPrompt: true, niche: true },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Get queued leads that don't have generated emails yet
    const leads = await prisma.campaignLead.findMany({
      where: {
        campaignId: id,
        status: "queued",
        generatedEmail: null,
      },
      take: 50, // Process max 50 at a time
      select: {
        id: true,
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            niche: true,
            city: true,
            country: true,
            googleRating: true,
            reviewCount: true,
            website: true,
          },
        },
      },
    });

    if (leads.length === 0) {
      return NextResponse.json({ generated: 0, message: "No queued leads without emails" });
    }

    let generated = 0;
    const previews: Array<{ leadId: string; subject: string; body: string }> = [];

    for (const lead of leads) {
      try {
        const result = await generateEmail(
          {
            ...lead.prospect,
            niche: lead.prospect.niche || campaign.niche,
          },
          campaign.systemPrompt
        );

        if (result.body) {
          await prisma.campaignLead.update({
            where: { id: lead.id },
            data: {
              generatedSubject: result.subject,
              generatedEmail: result.body,
            },
          });

          generated++;

          if (previews.length < 3) {
            previews.push({ leadId: lead.id, subject: result.subject, body: result.body });
          }
        }
      } catch (err) {
        console.error(`Generation failed for lead ${lead.id}:`, err);
      }

      // Delay between generations to respect Groq rate limits
      if (leads.indexOf(lead) < leads.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      generated,
      total: leads.length,
      previews,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/cold-email/[id]/generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
