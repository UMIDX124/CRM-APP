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

/**
 * Number of immediate retry attempts per delivery before giving up.
 * Each attempt uses exponential backoff: 1s, 4s, 16s.
 */
const MAX_RETRY_ATTEMPTS = 3;
/**
 * Webhook is auto-disabled after this many consecutive failures at the
 * subscriber level (not per delivery). A consumer whose endpoint has
 * been down for a while stops draining resources and waits for a human
 * to re-enable it.
 */
const AUTO_DISABLE_AFTER_FAILURES = 10;

async function deliverOne(
  webhook: { id: string; url: string; secret: string | null },
  event: WebhookEventName,
  payload: Record<string, unknown>
): Promise<void> {
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
  let attemptCount = 0;
  let startedAt = Date.now();

  // Retry with exponential backoff (1s → 4s → 16s). Total ceiling is
  // ~21s which fits comfortably inside the 60s function budget for
  // most routes that call dispatchWebhook. The retry loop bails as
  // soon as a 2xx is returned.
  for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
    attemptCount = i + 1;
    startedAt = Date.now();
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
      if (res.ok) {
        success = true;
        errorMessage = null;
        break;
      }
      errorMessage = `HTTP ${res.status}`;
      // Don't retry on 4xx — the caller's payload is the problem, not
      // the network. 4xx responses are terminal.
      if (res.status >= 400 && res.status < 500) {
        break;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // Backoff: 1s, 4s, 16s between attempts (not after the last one)
    if (i < MAX_RETRY_ATTEMPTS - 1) {
      const delay = Math.pow(4, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const durationMs = Date.now() - startedAt;

  // Persist delivery row + bump counters in parallel.
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
        attemptCount,
        durationMs,
        deliveredAt: new Date(),
      },
    }),
    prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        totalDeliveries: { increment: 1 },
        ...(success
          ? {
              successCount: { increment: 1 },
              failureCount: 0, // reset streak on success
              lastTriggeredAt: new Date(),
            }
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

  // Auto-disable after too many consecutive failures. The failureCount
  // is reset to 0 on every success above, so this counts *consecutive*
  // failures only. Fetch the fresh value because increment() already
  // ran and we need the post-increment snapshot.
  if (!success) {
    try {
      const current = await prisma.webhook.findUnique({
        where: { id: webhook.id },
        select: { failureCount: true, isActive: true },
      });
      if (
        current &&
        current.isActive &&
        current.failureCount >= AUTO_DISABLE_AFTER_FAILURES
      ) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { isActive: false },
        });
        console.warn(
          `[webhooks] auto-disabled ${webhook.id} after ${current.failureCount} consecutive failures`
        );
      }
    } catch (err) {
      console.error(
        `[webhooks] auto-disable check failed for ${webhook.id}:`,
        err
      );
    }
  }
}
