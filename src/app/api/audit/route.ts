import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const entity = url.searchParams.get("entity");
    const action = url.searchParams.get("action");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
