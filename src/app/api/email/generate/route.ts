import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { generateEmail } from "@/lib/cold-email/generator";
import { z } from "zod";

export const maxDuration = 60;

const generateSchema = z.object({
  prospectIds: z.array(z.string()).min(1).max(50),
  campaignId: z.string(),
  customPrompt: z.string().max(5000).optional().nullable(),
});

// POST — generate AI cold emails for prospects
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("email-generate", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { prospectIds, campaignId, customPrompt } = parsed.data;

    // Verify campaign access
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: campaignId,
        ...(user.companyId ? { companyId: user.companyId } : {}),
      },
      select: { id: true, systemPrompt: true, niche: true },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Fetch prospects
    const prospects = await prisma.prospect.findMany({
      where: { id: { in: prospectIds } },
      select: {
        id: true,
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
    });

    const systemPrompt = customPrompt || campaign.systemPrompt || null;
    let generated = 0;
    const previews: Array<{ prospectId: string; subject: string; body: string }> = [];

    for (const prospect of prospects) {
      try {
        const result = await generateEmail(
          { ...prospect, niche: prospect.niche || campaign.niche },
          systemPrompt
        );

        if (result.body) {
          // Update the CampaignLead record
          await prisma.campaignLead.updateMany({
            where: {
              campaignId,
              prospectId: prospect.id,
            },
            data: {
              generatedSubject: result.subject,
              generatedEmail: result.body,
            },
          });

          generated++;
          if (previews.length < 3) {
            previews.push({ prospectId: prospect.id, subject: result.subject, body: result.body });
          }
        }
      } catch (err) {
        console.error(`Generation failed for prospect ${prospect.id}:`, err);
      }

      // Delay for Groq rate limits
      if (prospects.indexOf(prospect) < prospects.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({ generated, total: prospects.length, previews });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/email/generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
