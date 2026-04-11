/**
 * HMAC-based unsubscribe token generation/verification.
 * Prevents unauthorized unsubscribe attacks on public endpoint.
 */

import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET required for unsubscribe tokens");
  return secret;
}

export function generateUnsubscribeToken(prospectId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`unsub:${prospectId}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(prospectId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(prospectId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function buildUnsubscribeUrl(prospectId: string): string {
  const token = generateUnsubscribeToken(prospectId);
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://alpha-command-center.vercel.app";
  return `${baseUrl}/api/email/unsubscribe?id=${prospectId}&token=${token}`;
}
