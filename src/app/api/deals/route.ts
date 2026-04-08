import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhooks";

/**
 * GET /api/deals
 *
 * Filters: stage, brand (code), ownerId, clientId, q (search title/description)
 * Returns deals with brand, owner, client, lead, and last 3 activities.
 */
export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const brand = url.searchParams.get("brand");
    const ownerId = url.searchParams.get("ownerId");
    const clientId = url.searchParams.get("clientId");
    const q = url.searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (stage) where.stage = stage;
    if (brand) where.brand = { code: brand };
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
    const body = await req.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        value: typeof body.value === "number" ? body.value : 0,
        currency: body.currency || "USD",
        stage: body.stage || "NEW",
        probability:
          typeof body.probability === "number" ? body.probability : 20,
        expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
        ownerId: body.ownerId ?? user.id,
        brandId: body.brandId ?? null,
        clientId: body.clientId ?? null,
        leadId: body.leadId ?? null,
        source: body.source ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
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
