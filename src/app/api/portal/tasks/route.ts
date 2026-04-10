import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portal-auth";

export async function GET() {
  try {
    const client = await requirePortalAuth();

    const tasks = await prisma.task.findMany({
      where: { clientId: client.id },
      select: {
        id: true, title: true, description: true, status: true,
        priority: true, dueDate: true, completedAt: true, createdAt: true,
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "PortalUnauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[portal/tasks]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
