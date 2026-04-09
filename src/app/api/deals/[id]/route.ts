import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dispatchWebhook, type WebhookEventName } from "@/lib/webhooks";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;

    // findFirst + tenantWhere prevents a user from fetching a deal by ID
    // outside of their company/brand scope. Return 404 (not 403) so we
    // don't leak whether the row exists elsewhere.
    const deal = await prisma.deal.findFirst({
      where: { id, ...tenantWhere(user) },
      include: {
        brand: { select: { code: true, color: true, name: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
        },
        client: { select: { id: true, companyName: true, contactName: true, email: true } },
        lead: { select: { id: true, companyName: true, contactName: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json(deal);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * PATCH /api/deals/[id]
 *
 * Used for both edits and stage drag/drop. When `stage` changes the route
 * automatically:
 *  - records a STAGE_CHANGE activity
 *  - sets actualClose if moving into CLOSED_WON / CLOSED_LOST
 *  - dispatches DEAL_STAGE_CHANGED + DEAL_WON / DEAL_LOST webhooks
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    // Tenant-scoped existence check. findFirst + tenantWhere closes the
    // cross-tenant PATCH bypass where any authenticated user could
    // guess-and-mutate another company's deal.
    const existing = await prisma.deal.findFirst({
      where: { id, ...tenantWhere(user) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "title",
      "description",
      "value",
      "currency",
      "stage",
      "probability",
      "expectedClose",
      "actualClose",
      "lostReason",
      "winReason",
      "followUpDate",
      "dealScore",
      "ownerId",
      "brandId",
      "clientId",
      "leadId",
      "source",
      "tags",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if ("expectedClose" in updateData && updateData.expectedClose) {
      updateData.expectedClose = new Date(updateData.expectedClose as string);
    }
    if ("followUpDate" in updateData && updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate as string);
    }

    const stageChanged =
      typeof body.stage === "string" && body.stage !== existing.stage;
    if (stageChanged) {
      // Enforce win/loss reason gate
      if (body.stage === "CLOSED_WON" && !body.winReason && !existing.winReason) {
        return NextResponse.json(
          { error: "winReason is required when closing a deal as won" },
          { status: 400 }
        );
      }
      if (body.stage === "CLOSED_LOST" && !body.lostReason && !existing.lostReason) {
        return NextResponse.json(
          { error: "lostReason is required when closing a deal as lost" },
          { status: 400 }
        );
      }
      if (body.stage === "CLOSED_WON" || body.stage === "CLOSED_LOST") {
        updateData.actualClose = new Date();
      }
      if (body.stage === "CLOSED_WON") updateData.probability = 100;
      if (body.stage === "CLOSED_LOST") updateData.probability = 0;
      // Reset days-in-stage timer
      updateData.stageEnteredAt = new Date();
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { code: true, color: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
    });

    if (stageChanged) {
      await prisma.dealActivity.create({
        data: {
          dealId: id,
          userId: user.id,
          type: "STAGE_CHANGE",
          content: `Stage changed from ${existing.stage} to ${deal.stage}`,
          metadata: { from: existing.stage, to: deal.stage },
        },
      });

      const stageEvents: WebhookEventName[] = ["DEAL_STAGE_CHANGED"];
      if (deal.stage === "CLOSED_WON") stageEvents.push("DEAL_WON");
      if (deal.stage === "CLOSED_LOST") stageEvents.push("DEAL_LOST");
      for (const ev of stageEvents) {
        await dispatchWebhook(
          ev,
          {
            id: deal.id,
            title: deal.title,
            value: deal.value,
            stage: deal.stage,
            previousStage: existing.stage,
            brand: deal.brand?.code ?? null,
          },
          { brandId: deal.brandId }
        );
      }
    }

    await logAudit({
      action: "UPDATE",
      entity: "Deal",
      entityId: id,
      userId: user.id,
      changes: updateData,
    });

    return NextResponse.json(deal);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;

    // Tenant ownership check before destructive op.
    const existing = await prisma.deal.findFirst({
      where: { id, ...tenantWhere(user) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    await prisma.deal.delete({ where: { id } });
    await logAudit({
      action: "DELETE",
      entity: "Deal",
      entityId: id,
      userId: user.id,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
