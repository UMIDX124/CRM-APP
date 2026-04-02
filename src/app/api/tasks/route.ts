import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignee = url.searchParams.get("assignee");
    const brand = url.searchParams.get("brand");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignee) where.assigneeId = assignee;
    if (brand) where.brand = { code: brand };
    if (!isManager(user.role)) where.assigneeId = user.id;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, companyName: true } },
        brand: { select: { code: true, color: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const task = await prisma.task.create({
      data: { ...body, creatorId: user.id },
    });

    await logAudit({
      action: "CREATE", entity: "Task", entityId: task.id, userId: user.id,
      changes: { task: { old: null, new: { title: body.title, status: body.status } } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
