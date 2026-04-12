import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureTaskAccess } from "@/lib/task-access";

const timeActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("stop"), note: z.string().max(500).optional() }),
  z.object({
    action: z.literal("manual"),
    durationMinutes: z.number().positive().max(60 * 24),
    note: z.string().max(500).optional(),
  }),
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = await ensureTaskAccess(id, user.id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const [entries, totals] = await Promise.all([
      prisma.taskTimeEntry.findMany({
        where: { taskId: id },
        orderBy: { startedAt: "desc" },
        take: 100,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.taskTimeEntry.aggregate({
        where: { taskId: id },
        _sum: { durationSec: true },
      }),
    ]);

    const activeEntry = await prisma.taskTimeEntry.findFirst({
      where: { taskId: id, userId: user.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      entries,
      totalSeconds: totals._sum.durationSec ?? 0,
      activeEntry,
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
    const parsed = timeActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    if (parsed.data.action === "start") {
      // Stop any other running entry from the same user first (single timer per user).
      await prisma.taskTimeEntry.updateMany({
        where: { userId: user.id, endedAt: null },
        data: { endedAt: new Date() },
      });

      const entry = await prisma.taskTimeEntry.create({
        data: { taskId: id, userId: user.id, startedAt: new Date() },
      });

      await prisma.taskActivity.create({
        data: { taskId: id, userId: user.id, type: "time_started", payload: { entryId: entry.id } },
      }).catch(() => {});

      return NextResponse.json({ entry }, { status: 201 });
    }

    if (parsed.data.action === "stop") {
      const active = await prisma.taskTimeEntry.findFirst({
        where: { taskId: id, userId: user.id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (!active) return NextResponse.json({ error: "No active timer for this task" }, { status: 400 });

      const endedAt = new Date();
      const durationSec = Math.max(0, Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000));

      const entry = await prisma.taskTimeEntry.update({
        where: { id: active.id },
        data: { endedAt, durationSec, note: parsed.data.note ?? null },
      });

      // Sync the cumulative timeSpent (hours) on the parent Task
      const totals = await prisma.taskTimeEntry.aggregate({
        where: { taskId: id },
        _sum: { durationSec: true },
      });
      await prisma.task.update({
        where: { id },
        data: { timeSpent: (totals._sum.durationSec ?? 0) / 3600 },
      });

      await prisma.taskActivity.create({
        data: { taskId: id, userId: user.id, type: "time_stopped", payload: { entryId: entry.id, durationSec } },
      }).catch(() => {});

      return NextResponse.json({ entry });
    }

    // Manual entry — add a fixed-duration block
    const durationSec = Math.floor(parsed.data.durationMinutes * 60);
    const startedAt = new Date(Date.now() - durationSec * 1000);
    const endedAt = new Date();

    const entry = await prisma.taskTimeEntry.create({
      data: {
        taskId: id,
        userId: user.id,
        startedAt,
        endedAt,
        durationSec,
        note: parsed.data.note ?? null,
      },
    });

    const totals = await prisma.taskTimeEntry.aggregate({
      where: { taskId: id },
      _sum: { durationSec: true },
    });
    await prisma.task.update({
      where: { id },
      data: { timeSpent: (totals._sum.durationSec ?? 0) / 3600 },
    });

    await prisma.taskActivity.create({
      data: { taskId: id, userId: user.id, type: "time_manual", payload: { entryId: entry.id, durationSec } },
    }).catch(() => {});

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
