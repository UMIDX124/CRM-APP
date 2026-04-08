import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/deals/import   body: { rows: DealRow[], brandId?: string }
 *
 * Bulk-create deals from a parsed CSV (client parses the file client-side
 * and posts a JSON array). Accepts up to 500 rows per request. Each row
 * is validated individually — invalid rows are returned in the response
 * alongside successful counts so the UI can surface errors inline.
 *
 * Expected row shape (all optional except title):
 *   { title, description?, value?, currency?, stage?, probability?,
 *     expectedClose?, source?, clientName?, tags? (comma-separated) }
 */

type DealRow = {
  title?: unknown;
  description?: unknown;
  value?: unknown;
  currency?: unknown;
  stage?: unknown;
  probability?: unknown;
  expectedClose?: unknown;
  source?: unknown;
  clientName?: unknown;
  tags?: unknown;
};

const VALID_STAGES = ["NEW", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"] as const;
type Stage = typeof VALID_STAGES[number];

function toStr(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s.slice(0, max) : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStage(v: unknown): Stage {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return (VALID_STAGES as readonly string[]).includes(s) ? (s as Stage) : "NEW";
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth();
    const rl = await rateLimit("deals-import", req, { limit: 5, windowSec: 300 }, actor.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many imports" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({} as { rows?: DealRow[] }));
    const rows = Array.isArray(body.rows) ? (body.rows as DealRow[]) : [];
    const brandId = typeof body.brandId === "string" ? body.brandId : null;

    if (rows.length === 0) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "max 500 rows per import" }, { status: 400 });
    }

    // Pre-load clients by exact company name so we can resolve FK ids
    const clientNames = new Set<string>();
    for (const r of rows) {
      const n = toStr(r.clientName, 200);
      if (n) clientNames.add(n);
    }
    const clientMap = new Map<string, string>();
    if (clientNames.size > 0) {
      const existing = await prisma.client.findMany({
        where: { companyName: { in: Array.from(clientNames) } },
        select: { id: true, companyName: true },
      });
      for (const c of existing) clientMap.set(c.companyName, c.id);
    }

    const created: Array<{ row: number; id: string }> = [];
    const failed: Array<{ row: number; reason: string }> = [];

    // Sequential inserts so we can record per-row outcomes. 500 rows at
    // ~5ms each = ~2.5s which stays well inside the function budget.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = toStr(r.title, 200);
      if (!title) {
        failed.push({ row: i + 1, reason: "title is required" });
        continue;
      }

      try {
        const probRaw = toNum(r.probability);
        const prob = probRaw === null ? 20 : Math.max(0, Math.min(100, Math.round(probRaw)));

        const clientName = toStr(r.clientName, 200);
        const clientId = clientName ? clientMap.get(clientName) ?? null : null;

        const tagsRaw = toStr(r.tags, 500);
        const tags = tagsRaw
          ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20)
          : [];

        const deal = await prisma.deal.create({
          data: {
            title,
            description: toStr(r.description, 2000),
            value: toNum(r.value) ?? 0,
            currency: toStr(r.currency, 8) ?? "USD",
            stage: toStage(r.stage),
            probability: prob,
            expectedClose: toDate(r.expectedClose),
            source: toStr(r.source, 120),
            tags,
            clientId,
            ownerId: actor.id,
            brandId,
          },
          select: { id: true },
        });
        created.push({ row: i + 1, id: deal.id });
      } catch (err) {
        failed.push({
          row: i + 1,
          reason: err instanceof Error ? err.message.slice(0, 200) : "insert failed",
        });
      }
    }

    await logAudit({
      action: "CREATE",
      entity: "Deal",
      entityId: "bulk",
      userId: actor.id,
      metadata: { imported: created.length, failed: failed.length },
    }).catch(() => {});

    return NextResponse.json({
      imported: created.length,
      failed: failed.length,
      created,
      failures: failed,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Deals import error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
