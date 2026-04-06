import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const entity = url.searchParams.get("entity");
    const action = url.searchParams.get("action");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 500);

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    // Fetch audit logs without joining user — some entries have userId: "system"
    // which has no matching user row, so a required join would fail
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Collect unique real userIds (skip "system" and similar sentinels)
    const userIds = Array.from(
      new Set(
        logs
          .map((l) => l.userId)
          .filter((id): id is string => Boolean(id) && id !== "system")
      )
    );

    // Batch-fetch users
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Attach user info if available, else leave null
    const logsWithUser = logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    return NextResponse.json(logsWithUser);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("Audit API error:", e);
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
