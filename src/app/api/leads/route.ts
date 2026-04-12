import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateLeadScore } from "@/lib/scoring";

// Strict lead-create schema. Replaces the previous raw `body` spread
// that allowed callers to inject any writable field.
const leadCreateSchema = z.object({
  companyName: z.string().min(1).max(240),
  contactName: z.string().min(1).max(240),
  email: z.string().email().max(320).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  countryFlag: z.string().max(10).optional().nullable(),
  services: z.array(z.string().max(120)).max(20).optional().default([]),
  source: z.string().max(120).optional().nullable(),
  status: z.enum(["NEW", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]).optional().default("NEW"),
  value: z.number().nonnegative().finite().optional().default(0),
  probability: z.number().int().min(0).max(100).optional().default(50),
  salesRepId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  expectedClose: z.string().optional().nullable(),
  nextAction: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const brand = url.searchParams.get("brand");

    // Tenant scope first; query params can only narrow, never widen.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (status) where.status = status;
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { brand: { select: { code: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const raw = await req.json().catch(() => null);
    const parsed = leadCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "LEAD_VALIDATION",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Auto-compute lead score from initial signals (source, value, phone,
    // services, status). Updated by PATCH as the lead progresses.
    const leadScore = calculateLeadScore({
      source: body.source ?? null,
      value: body.value,
      phone: body.phone ?? null,
      services: body.services,
      status: body.status,
      createdAt: new Date(),
    });

    const lead = await prisma.lead.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email ?? null,
        phone: body.phone ?? null,
        country: body.country ?? null,
        countryFlag: body.countryFlag ?? null,
        services: body.services,
        source: body.source ?? null,
        status: body.status,
        leadScore,
        value: body.value,
        probability: body.probability,
        salesRepId: body.salesRepId ?? null,
        brandId: body.brandId ?? null,
        expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
        nextAction: body.nextAction ?? null,
        notes: body.notes ?? null,
      },
    });

    await logAudit({
      action: "CREATE", entity: "Lead", entityId: lead.id, userId: user.id,
      changes: { lead: { old: null, new: { companyName: body.companyName, value: body.value } } },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
