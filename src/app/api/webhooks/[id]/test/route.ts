import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import crypto from "crypto";

/**
 * POST /api/webhooks/[id]/test
 *
 * Fires a synthetic test payload to the webhook URL and reports the result
 * (status, latency, body) to the caller. Also records the attempt in the
 * deliveries log so it shows up in history.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    // 10 test fires/min/user — outbound calls cost money downstream
    const rl = await rateLimit("webhook-test", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many test fires" }, { status: 429 });
    }
    const { id } = await ctx.params;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const payload = {
      test: true,
      message: "This is a test delivery from FU Corp CRM",
      webhook: { id: webhook.id, name: webhook.name },
    };
    const body = JSON.stringify({
      event: "TEST",
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "FU-Corp-CRM-Webhook/1.0",
      "X-Webhook-Event": "TEST",
      "X-Webhook-Id": webhook.id,
    };
    if (webhook.secret) {
      headers["X-Webhook-Signature"] =
        "sha256=" +
        crypto
          .createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");
    }

    const startedAt = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(t);
      responseStatus = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      success = res.ok;
      if (!success) errorMessage = `HTTP ${res.status}`;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - startedAt;

    // Record delivery + counter bump (we use LEAD_CREATED as the placeholder
    // event since "TEST" isn't in the enum — distinguish via payload.test).
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: "LEAD_CREATED",
        payload: { ...payload, _test: true },
        status: success ? "SUCCESS" : "FAILED",
        responseStatus,
        responseBody,
        errorMessage,
        attemptCount: 1,
        durationMs,
        deliveredAt: new Date(),
      },
    });
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        totalDeliveries: { increment: 1 },
        ...(success
          ? { successCount: { increment: 1 }, lastTriggeredAt: new Date() }
          : {
              failureCount: { increment: 1 },
              lastErrorAt: new Date(),
              lastError: errorMessage,
            }),
      },
    });

    return NextResponse.json({
      success,
      durationMs,
      responseStatus,
      responseBody,
      errorMessage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
