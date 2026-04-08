import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { hashPassword } from "@/lib/auth";
import { verifyResetToken } from "@/lib/reset-token";

/**
 * POST /api/auth/reset-password
 *
 * Body: { token: string, password: string }
 *
 * Consumes a stateless reset token. Tokens are HMAC-signed over the user's
 * current passwordHash, so once this handler successfully updates the
 * password the old token becomes invalid automatically — no DB token
 * column required.
 */
export async function POST(req: Request) {
  try {
    // 10 attempts / 10 min / IP to stop brute-force of the MAC
    const rl = await rateLimit("reset-password", req, { limit: 10, windowSec: 600 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Peek at the userId inside the token so we can load the current hash
    // without trusting the token yet.
    const [userIdB64] = token.split(".");
    if (!userIdB64) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    let userId: string;
    try {
      const pad = userIdB64.length % 4 === 0 ? "" : "=".repeat(4 - (userIdB64.length % 4));
      userId = Buffer.from(
        userIdB64.replace(/-/g, "+").replace(/_/g, "/") + pad,
        "base64"
      ).toString("utf8");
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const verified = verifyResetToken(token, user.passwordHash);
    if (!verified.valid || verified.userId !== user.id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const newHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    // Invalidate any lingering sessions so the old password's sessions don't
    // outlive the reset.
    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset-password error:", err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
