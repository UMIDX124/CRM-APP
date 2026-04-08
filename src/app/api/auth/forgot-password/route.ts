import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { createResetToken } from "@/lib/reset-token";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email: string }
 *
 * Always returns 200 with a generic message regardless of whether the email
 * maps to an existing account — this prevents user-enumeration via timing
 * or response text. If a matching ACTIVE user exists we quietly send a
 * reset-link email.
 */
export async function POST(req: Request) {
  try {
    // 5 requests / 15 minutes / IP
    const rl = await rateLimit("forgot-password", req, { limit: 5, windowSec: 900 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      // Still return 200 to avoid leaking which emails are valid
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, passwordHash: true, status: true },
    });

    if (user && user.status === "ACTIVE") {
      try {
        const token = createResetToken(user.id, user.passwordHash);
        const appUrl = process.env.APP_URL || "https://fu-corp-crm.vercel.app";
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
        await sendPasswordResetEmail(user.email, user.firstName, resetUrl);
      } catch (err) {
        // Log but don't surface — the response is always generic
        console.error("Forgot-password email error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    // Still return 200 to prevent leaking details
    return NextResponse.json({ ok: true });
  }
}
