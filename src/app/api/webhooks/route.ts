import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

const VALID_EVENTS = [
  "LEAD_CREATED",
  "CLIENT_CREATED",
  "DEAL_CREATED",
  "DEAL_STAGE_CHANGED",
  "DEAL_WON",
  "DEAL_LOST",
  "TICKET_CREATED",
  "TICKET_STATUS_CHANGED",
  "TICKET_RESOLVED",
  "INVOICE_CREATED",
  "INVOICE_PAID",
] as const;

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");

    const where: Record<string, unknown> = {};
    if (brand) where.brand = { code: brand };

    const webhooks = await prisma.webhook.findMany({
      where,
      include: {
        brand: { select: { code: true, color: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/webhooks
 *
 * Body: { name, url, events: [WebhookEvent], description?, brandId?, secret? }
 * If `secret` is omitted a 32-byte random hex secret is generated.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    // Webhook subscribers can exfiltrate tenant data to arbitrary URLs,
    // so creation must be gated to managers. Previously anyone with
    // a valid session could register a receiver.
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    const body = await req.json();

    if (!body.name || !body.url) {
      return NextResponse.json(
        { error: "name and url are required" },
        { status: 400 }
      );
    }
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: "url must be a valid URL" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: "events must be a non-empty array" },
        { status: 400 }
      );
    }
    const invalid = body.events.filter(
      (e: string) => !VALID_EVENTS.includes(e as (typeof VALID_EVENTS)[number])
    );
    if (invalid.length) {
      return NextResponse.json(
        { error: `Invalid events: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    const webhook = await prisma.webhook.create({
      data: {
        name: body.name,
        url: body.url,
        description: body.description ?? null,
        brandId: body.brandId ?? null,
        events: body.events,
        secret: body.secret || crypto.randomBytes(32).toString("hex"),
        isActive: body.isActive !== false,
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "Webhook",
      entityId: webhook.id,
      userId: user.id,
      changes: { name: webhook.name, url: webhook.url, events: webhook.events },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
