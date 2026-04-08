/**
 * Outbound webhook dispatcher.
 *
 * Fires registered webhooks when domain events occur (deal stage change,
 * ticket created, etc.). Records every attempt in webhook_deliveries with
 * status, latency, and response so the UI can show delivery history.
 *
 * Signed deliveries: when a webhook has a `secret`, an HMAC-SHA256 of the
 * raw payload bytes is sent in `X-Webhook-Signature` so consumers can
 * verify authenticity. We also send `X-Webhook-Event` and `X-Webhook-Id`.
 *
 * Errors are caught and logged — never thrown to the caller, so a webhook
 * outage cannot break a domain operation.
 */

import crypto from "crypto";
import { prisma } from "./db";

export type WebhookEventName =
  | "LEAD_CREATED"
  | "CLIENT_CREATED"
  | "DEAL_CREATED"
  | "DEAL_STAGE_CHANGED"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "TICKET_CREATED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_RESOLVED"
  | "INVOICE_CREATED"
  | "INVOICE_PAID";

interface DispatchOptions {
  /** If set, only fire webhooks attached to this brand or to no brand. */
  brandId?: string | null;
}

export async function dispatchWebhook(
  event: WebhookEventName,
  payload: Record<string, unknown>,
  options: DispatchOptions = {}
): Promise<void> {
  try {
    const subscribers = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
        ...(options.brandId !== undefined
          ? { OR: [{ brandId: options.brandId }, { brandId: null }] }
          : {}),
      },
    });

    if (subscribers.length === 0) return;

    // Fire all in parallel — each is fully isolated
    await Promise.allSettled(
      subscribers.map((webhook) => deliverOne(webhook, event, payload))
    );
  } catch (err) {
    // Top-level safety net — never propagate webhook errors to the caller
    console.error(`[webhooks] dispatch failed for ${event}:`, err);
  }
}

async function deliverOne(
  webhook: { id: string; url: string; secret: string | null },
  event: WebhookEventName,
  payload: Record<string, unknown>
): Promise<void> {
  const startedAt = Date.now();
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FU-Corp-CRM-Webhook/1.0",
    "X-Webhook-Event": event,
    "X-Webhook-Id": webhook.id,
  };
  if (webhook.secret) {
    headers["X-Webhook-Signature"] =
      "sha256=" +
      crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
  }

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    responseStatus = res.status;
    try {
      responseBody = (await res.text()).slice(0, 2000);
    } catch {
      responseBody = null;
    }
    success = res.ok;
    if (!success) errorMessage = `HTTP ${res.status}`;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startedAt;

  // Persist delivery + bump counters in parallel
  await Promise.all([
    prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as object,
        status: success ? "SUCCESS" : "FAILED",
        responseStatus,
        responseBody,
        errorMessage,
        attemptCount: 1,
        durationMs,
        deliveredAt: new Date(),
      },
    }),
    prisma.webhook.update({
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
    }),
  ]).catch((err) => {
    console.error(`[webhooks] persistence failed for ${webhook.id}:`, err);
  });
}
