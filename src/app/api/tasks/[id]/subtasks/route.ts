import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureTaskAccess } from "@/lib/task-access";

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().nonnegative().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const subtasks = await prisma.task.findMany({
      where: { parentTaskId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    return NextResponse.json({ subtasks });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const parent = await ensureTaskAccess(id, user.id);
    if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = createSubtaskSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    // Inherit brand/list/client from parent so the subtask stays in the same scope
    const parentDetail = await prisma.task.findUnique({
      where: { id },
      select: { brandId: true, listId: true, clientId: true },
    });

    const count = await prisma.task.count({ where: { parentTaskId: id } });

    const subtask = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        estimateHours: parsed.data.estimateHours ?? null,
        parentTaskId: id,
        brandId: parentDetail?.brandId ?? null,
        listId: parentDetail?.listId ?? null,
        clientId: parentDetail?.clientId ?? null,
        creatorId: user.id,
        order: count,
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: id,
        userId: user.id,
        type: "subtask_added",
        payload: { subtaskId: subtask.id, title: subtask.title },
      },
    }).catch(() => {});

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
