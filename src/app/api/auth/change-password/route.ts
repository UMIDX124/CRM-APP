import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";

const LIMIT = { limit: 5, windowSec: 60 };

export async function POST(req: Request) {
  try {
    const limited = await rateLimit("auth-change-pw", req, LIMIT);
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a minute." },
        { status: 429, headers: rateLimitHeaders(limited, LIMIT) }
      );
    }

    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    await logAudit({
      action: "UPDATE", entity: "User", entityId: user.id, userId: user.id,
      changes: { password: { old: "[redacted]", new: "[changed]" } },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
