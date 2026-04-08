import crypto from "crypto";

/**
 * Stateless, single-use password-reset tokens.
 *
 * A token is `base64url(userId).base64url(expiresMs).hex(hmac)` where the
 * HMAC is computed over `userId|expiresMs|passwordHash` using
 * `AUTH_SECRET`. Because the current passwordHash is part of the signed
 * payload, once the user successfully resets their password (and the hash
 * changes), all previously issued tokens become invalid automatically —
 * no DB column required.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not configured");
  return secret;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createResetToken(userId: string, passwordHash: string): string {
  const expiresMs = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}|${expiresMs}|${passwordHash}`;
  const mac = sign(payload);
  return `${b64url(userId)}.${b64url(String(expiresMs))}.${mac}`;
}

export type VerifiedToken = {
  valid: boolean;
  reason?: "malformed" | "expired" | "invalid-signature";
  userId?: string;
};

export function parseResetToken(token: string): { userId: string; expiresMs: number; mac: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const userId = fromB64url(parts[0]).toString("utf8");
    const expiresMs = Number(fromB64url(parts[1]).toString("utf8"));
    if (!userId || !Number.isFinite(expiresMs)) return null;
    return { userId, expiresMs, mac: parts[2] };
  } catch {
    return null;
  }
}

export function verifyResetToken(token: string, passwordHash: string): VerifiedToken {
  const parsed = parseResetToken(token);
  if (!parsed) return { valid: false, reason: "malformed" };
  if (parsed.expiresMs < Date.now()) return { valid: false, reason: "expired" };
  const expectedMac = sign(`${parsed.userId}|${parsed.expiresMs}|${passwordHash}`);
  if (expectedMac.length !== parsed.mac.length) {
    return { valid: false, reason: "invalid-signature" };
  }
  const ok = crypto.timingSafeEqual(
    Buffer.from(expectedMac, "hex"),
    Buffer.from(parsed.mac, "hex")
  );
  if (!ok) return { valid: false, reason: "invalid-signature" };
  return { valid: true, userId: parsed.userId };
}
