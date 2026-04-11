import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const manualProspectSchema = z.object({
  prospects: z
    .array(
      z.object({
        email: z.string().min(3).max(254),
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        company: z.string().max(200).optional(),
        niche: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(200),
});

// GET — fetch prospects by IDs (used by campaign wizard)
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ prospects: [] });
    }

    const ids = idsParam.split(",").filter(Boolean).slice(0, 200);

    const where: Record<string, unknown> = {
      id: { in: ids },
    };
    if (user.companyId) {
      where.companyId = user.companyId;
    }

    const prospects = await prisma.prospect.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        website: true,
        niche: true,
        city: true,
        emailStatus: true,
        googleRating: true,
        reviewCount: true,
      },
    });

    return NextResponse.json({ prospects });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/cold-email/prospects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — manually add prospects (fallback when scraping isn't viable)
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("prospects-manual", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    if (!user.companyId) {
      return NextResponse.json({ error: "No company assigned" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = manualProspectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const savedProspectIds: string[] = [];
    let saved = 0;
    let duplicates = 0;
    let invalid = 0;

    for (const raw of parsed.data.prospects) {
      const email = raw.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(email) || email.length > 254) {
        invalid++;
        continue;
      }

      try {
        const existing = await prisma.prospect.findUnique({
          where: { email_companyId: { email, companyId: user.companyId } },
          select: { id: true },
        });

        if (existing) {
          duplicates++;
          savedProspectIds.push(existing.id);
          continue;
        }

        const created = await prisma.prospect.create({
          data: {
            email,
            firstName: raw.firstName || null,
            lastName: raw.lastName || null,
            company: raw.company || null,
            niche: raw.niche || null,
            city: raw.city || null,
            country: raw.country || null,
            source: "manual",
            companyId: user.companyId,
          },
          select: { id: true },
        });
        saved++;
        savedProspectIds.push(created.id);
      } catch (err) {
        console.error("Manual prospect upsert error:", err);
        invalid++;
      }
    }

    return NextResponse.json({
      saved,
      duplicates,
      invalid,
      prospectIds: savedProspectIds,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/cold-email/prospects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
