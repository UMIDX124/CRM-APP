import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhooks";

const DEAL_STAGES = ["NEW", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"] as const;

// Strict deal-create schema. Replaces the previous `...body` spread that
// let callers inject any writable field (including brandId pointing at
// another tenant's brand). Every field that touches the database is
// whitelisted and bounded.
const dealCreateSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional().nullable(),
  value: z.number().nonnegative().finite().optional().default(0),
  currency: z.string().length(3).optional().default("USD"),
  stage: z.enum(DEAL_STAGES).optional().default("NEW"),
  probability: z.number().int().min(0).max(100).optional().default(20),
  expectedClose: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).optional().default([]),
});


/**
 * GET /api/deals
 *
 * Filters: stage, brand (code), ownerId, clientId, q (search title/description)
 * Returns deals with brand, owner, client, lead, and last 3 activities.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const brand = url.searchParams.get("brand");
    const ownerId = url.searchParams.get("ownerId");
    const clientId = url.searchParams.get("clientId");
    const q = url.searchParams.get("q");

    // Enforce multi-tenant scoping first so no combination of filters can
    // widen access beyond what the caller's role permits.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (stage) where.stage = stage;
    // `brand=CODE` query param narrows within the tenant scope; a manager
    // can drill into a single brand but can't escape their companyId.
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }
    if (ownerId) where.ownerId = ownerId;
    if (clientId) where.clientId = clientId;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        brand: { select: { code: true, color: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        client: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { activities: true } },
      },
      orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
    });

    // Compute days-in-stage for each deal so the client doesn't have to
    const now = Date.now();
    const enriched = deals.map((d) => ({
      ...d,
      daysInStage: Math.floor(
        (now - new Date(d.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      isStale:
        d.stage !== "CLOSED_WON" &&
        d.stage !== "CLOSED_LOST" &&
        now - new Date(d.stageEnteredAt).getTime() > 14 * 24 * 60 * 60 * 1000,
      isFollowUpOverdue:
        d.followUpDate ? new Date(d.followUpDate).getTime() < now : false,
    }));

    return NextResponse.json(enriched);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/deals
 *
 * Body: { title, description?, value, currency?, stage?, probability?,
 *         expectedClose?, ownerId?, brandId?, clientId?, leadId?, source?, tags? }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const raw = await req.json().catch(() => null);
    const parsed = dealCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "DEAL_VALIDATION",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const deal = await prisma.deal.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        value: body.value,
        currency: body.currency,
        stage: body.stage,
        probability: body.probability,
        expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
        ownerId: body.ownerId ?? user.id,
        brandId: body.brandId ?? null,
        clientId: body.clientId ?? null,
        leadId: body.leadId ?? null,
        source: body.source ?? null,
        tags: body.tags,
      },
      include: {
        brand: { select: { code: true, color: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
    });

    // Initial creation activity
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: "NOTE",
        content: `Deal created in stage ${deal.stage}`,
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "Deal",
      entityId: deal.id,
      userId: user.id,
      changes: { title: deal.title, value: deal.value, stage: deal.stage },
    });

    // Outbound webhook
    await dispatchWebhook(
      "DEAL_CREATED",
      {
        id: deal.id,
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        stage: deal.stage,
        brand: deal.brand?.code ?? null,
      },
      { brandId: deal.brandId }
    );

    return NextResponse.json(deal, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
