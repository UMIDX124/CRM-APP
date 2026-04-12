import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureTaskAccess } from "@/lib/task-access";

const updateItemSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const user = await requireAuth();
    const { id, itemId } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const item = await prisma.taskChecklistItem.findFirst({
      where: { id: itemId, taskId: id },
      select: { id: true },
    });
    if (!item) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = updateItemSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const updated = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: parsed.data,
    });

    return NextResponse.json({ item: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const user = await requireAuth();
    const { id, itemId } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const item = await prisma.taskChecklistItem.findFirst({
      where: { id: itemId, taskId: id },
      select: { id: true },
    });
    if (!item) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

    await prisma.taskChecklistItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
