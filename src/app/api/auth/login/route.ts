import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(user.id, req);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await logAudit({
      action: "LOGIN", entity: "User", entityId: user.id, userId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      id: user.id, email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role, brandId: user.brandId,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
