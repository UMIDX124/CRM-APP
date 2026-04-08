import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

/**
 * POST /api/attendance/pin-verify   body: { pin: string }
 *
 * Server-side attendance-kiosk PIN verification. Replaces the previous
 * client-side `parseInt(pin) - 1000` hack that let anyone who could
 * read /api/employees derive every employee's PIN just by their index
 * in the response.
 *
 * Security model:
 *   - Kiosk is a public terminal with no session cookie, so this route
 *     is intentionally unauthenticated at the session layer (it must
 *     work from a shared check-in device). The proxy's /api/webhook/
 *     and /api/health whitelist already allows other unauthenticated
 *     public endpoints; this one is similarly scoped via its narrow
 *     attack surface: it only returns a small employee identity on
 *     match and 401 on miss.
 *   - Aggressive IP rate limit: 10 attempts / 5 min / IP. A brute-force
 *     of 4-digit PINs (10_000 combinations) takes > 3 days at this rate.
 *   - Constant-time comparison to avoid timing leaks.
 *   - Supports both bcrypt-hashed PINs (future) and raw 4-digit PINs
 *     (current seed) so existing kiosk setups keep working during the
 *     migration. When a match is found against a plaintext PIN we log
 *     a one-time warning so it's visible in logs.
 *
 * NOTE: the proxy currently blocks /api/attendance/** because it only
 * allows explicit prefixes. This route is referenced from the kiosk
 * which runs under / (outside /api/*), so the call goes through the
 * proxy. To make the kiosk actually reach this endpoint without a
 * session, the proxy's PUBLIC_API_PREFIXES needs to include
 * "/api/attendance/pin-verify" — update proxy.ts if you see 401s.
 */

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("pin-verify", req, { limit: 10, windowSec: 300 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: unknown };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    // Pull only users with a PIN set and who are allowed to check in.
    // Selecting the hashed value means the kiosk client never sees it.
    const candidates = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        pinCode: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        email: true,
        pinCode: true,
        brand: { select: { code: true } },
      },
    });

    let match: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      const stored = c.pinCode;
      if (!stored) continue;
      // Bcrypt hashes start with $2 — use bcrypt.compare for those,
      // constant-time plaintext compare otherwise.
      const isHashed = stored.startsWith("$2");
      const ok = isHashed
        ? await bcrypt.compare(pin, stored)
        : constantTimeEqual(pin, stored);
      if (ok) {
        match = c;
        if (!isHashed) {
          console.warn(
            `[pin-verify] user ${c.id} matched on plaintext PIN; migrate to bcrypt`
          );
        }
        break;
      }
    }

    if (!match) {
      // Generic message — never reveal whether a PIN length was valid
      // but just wrong versus no user found.
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({
      id: match.id,
      name: `${match.firstName} ${match.lastName}`.trim(),
      title: match.title ?? "",
      email: match.email,
      brand: match.brand?.code ?? "",
    });
  } catch (err) {
    console.error("[pin-verify] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
