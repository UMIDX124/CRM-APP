import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureTaskAccess } from "@/lib/task-access";

const addDependencySchema = z.object({
  blocksTaskId: z.string().min(1),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const [blockedBy, blocks] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { taskId: id },
        include: {
          blocks: {
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
          },
        },
      }),
      prisma.taskDependency.findMany({
        where: { blocksTaskId: id },
        include: {
          task: {
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      blockedBy: blockedBy.map((d) => ({ depId: d.id, task: d.blocks })),
      blocks: blocks.map((d) => ({ depId: d.id, task: d.task })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = addDependencySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    if (parsed.data.blocksTaskId === id) {
      return NextResponse.json({ error: "A task cannot block itself" }, { status: 400 });
    }

    const blocker = await ensureTaskAccess(parsed.data.blocksTaskId, user.id);
    if (!blocker) return NextResponse.json({ error: "Blocking task not accessible" }, { status: 404 });

    const dep = await prisma.taskDependency.upsert({
      where: { taskId_blocksTaskId: { taskId: id, blocksTaskId: parsed.data.blocksTaskId } },
      update: {},
      create: { taskId: id, blocksTaskId: parsed.data.blocksTaskId },
    });

    return NextResponse.json({ dependency: dep }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const url = new URL(req.url);
    const blocksTaskId = url.searchParams.get("blocksTaskId");
    if (!blocksTaskId) {
      return NextResponse.json({ error: "blocksTaskId query parameter required" }, { status: 400 });
    }

    await prisma.taskDependency.deleteMany({
      where: { taskId: id, blocksTaskId },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
