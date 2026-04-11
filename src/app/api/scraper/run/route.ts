import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { scrapeBusinessWebsites } from "@/lib/cold-email/scraper";
import { z } from "zod";

export const maxDuration = 60;

const scrapeSchema = z.object({
  websites: z
    .array(
      z.object({
        url: z.string().min(1).max(500),
        businessName: z.string().max(200).optional(),
        niche: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(50),
  campaignId: z.string().optional().nullable(),
});

// POST — scrape business websites for email addresses
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("scraper", req, { limit: 5, windowSec: 300 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests. Max 5 scrapes per 5 minutes." }, { status: 429 });

    if (!user.companyId) {
      return NextResponse.json({ error: "No company assigned" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = scrapeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { websites, campaignId } = parsed.data;

    // Scrape websites
    const prospects = await scrapeBusinessWebsites({ websites });

    let saved = 0;
    let duplicates = 0;
    const savedProspectIds: string[] = [];

    // Upsert prospects to DB
    for (const prospect of prospects) {
      try {
        const existing = await prisma.prospect.findUnique({
          where: {
            email_companyId: { email: prospect.email, companyId: user.companyId },
          },
          select: { id: true },
        });

        if (existing) {
          duplicates++;
          savedProspectIds.push(existing.id);
        } else {
          const created = await prisma.prospect.create({
            data: {
              email: prospect.email,
              firstName: prospect.firstName || null,
              company: prospect.company || null,
              website: prospect.website || null,
              phone: prospect.phone || null,
              niche: prospect.niche || null,
              city: prospect.city || null,
              country: prospect.country || null,
              source: "google_maps",
              companyId: user.companyId,
            },
            select: { id: true },
          });
          saved++;
          savedProspectIds.push(created.id);
        }
      } catch (err) {
        console.error("Prospect upsert error:", err);
      }
    }

    // If campaignId provided, add prospects to campaign
    let addedToCampaign = 0;
    if (campaignId && savedProspectIds.length > 0) {
      const existingLeads = await prisma.campaignLead.findMany({
        where: {
          campaignId,
          prospectId: { in: savedProspectIds },
        },
        select: { prospectId: true },
      });
      const existingSet = new Set(existingLeads.map((l) => l.prospectId));

      const newIds = savedProspectIds.filter((id) => !existingSet.has(id));
      if (newIds.length > 0) {
        await prisma.campaignLead.createMany({
          data: newIds.map((prospectId) => ({ campaignId, prospectId })),
        });
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { totalProspects: { increment: newIds.length } },
        });
        addedToCampaign = newIds.length;
      }
    }

    return NextResponse.json({
      scraped: prospects.length,
      withEmail: prospects.length,
      withoutEmail: websites.length - prospects.length,
      saved,
      duplicates,
      addedToCampaign,
      prospectIds: savedProspectIds,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/scraper/run error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
