import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

const VALID_STAGES = [
  "NEW",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

/**
 * POST /api/deals/bulk
 *
 * Body: { ids: string[], action: "reassign" | "stage" | "delete", payload: ... }
 *
 * - reassign: { ownerId }
 * - stage:    { stage }     (does NOT enforce win/loss reason — bulk close
 *              should be careful, frontend should warn)
 * - delete:   no payload
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    // 20 bulk ops/min/user — bulk mutations are heavy and irreversible
    const rl = await rateLimit("deals-bulk", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many bulk operations" }, { status: 429 });
    }
    const body = await req.json();
    const { ids, action, payload } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    if (ids.length > 200) {
      return NextResponse.json(
        { error: "Too many ids (max 200 per request)" },
        { status: 400 }
      );
    }

    let updated = 0;

    if (action === "reassign") {
      if (!payload?.ownerId || typeof payload.ownerId !== "string") {
        return NextResponse.json({ error: "ownerId required" }, { status: 400 });
      }
      const result = await prisma.deal.updateMany({
        where: { id: { in: ids } },
        data: { ownerId: payload.ownerId },
      });
      updated = result.count;
      await logAudit({
        action: "UPDATE",
        entity: "Deal",
        entityId: "bulk",
        userId: user.id,
        changes: { ids, ownerId: payload.ownerId, count: updated },
      });
    } else if (action === "stage") {
      if (!VALID_STAGES.includes(payload?.stage)) {
        return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      }
      const result = await prisma.deal.updateMany({
        where: { id: { in: ids } },
        data: {
          stage: payload.stage,
          stageEnteredAt: new Date(),
          ...(payload.stage === "CLOSED_WON"
            ? { actualClose: new Date(), probability: 100 }
            : {}),
          ...(payload.stage === "CLOSED_LOST"
            ? { actualClose: new Date(), probability: 0 }
            : {}),
        },
      });
      updated = result.count;
      await logAudit({
        action: "UPDATE",
        entity: "Deal",
        entityId: "bulk",
        userId: user.id,
        changes: { ids, stage: payload.stage, count: updated },
      });
    } else if (action === "delete") {
      const result = await prisma.deal.deleteMany({
        where: { id: { in: ids } },
      });
      updated = result.count;
      await logAudit({
        action: "DELETE",
        entity: "Deal",
        entityId: "bulk",
        userId: user.id,
        changes: { ids, count: updated },
      });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
