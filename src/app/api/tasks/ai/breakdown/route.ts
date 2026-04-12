import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { ensureTaskAccess } from "@/lib/task-access";
import { groqJson } from "@/lib/groq";

const bodySchema = z.object({
  taskId: z.string().min(1),
  count: z.number().int().min(2).max(12).optional().default(5),
  create: z.boolean().optional().default(false),
});

type BreakdownResponse = {
  subtasks: Array<{ title: string; description?: string; estimateHours?: number }>;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("tasks-ai-breakdown", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const access = await ensureTaskAccess(parsed.data.taskId, user.id);
    if (!access) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const task = await prisma.task.findUnique({
      where: { id: parsed.data.taskId },
      select: { title: true, description: true, priority: true, dueDate: true },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const ai = await groqJson<BreakdownResponse>({
      system: `You are a senior project manager who breaks down work into clear, actionable subtasks. Each subtask is one small step that can be completed in under a day. Be concrete and specific.`,
      prompt: `Break the following task into ${parsed.data.count} subtasks. Each should be specific and actionable. Estimate hours conservatively (0.5 to 8 per subtask).

Task title: ${task.title}
Priority: ${task.priority}
${task.description ? `Description: ${task.description}` : ""}
${task.dueDate ? `Due date: ${task.dueDate.toISOString().slice(0, 10)}` : ""}

Output JSON shape:
{ "subtasks": [ { "title": "string", "description": "1-line context", "estimateHours": number } ] }`,
      maxOutputTokens: 800,
      temperature: 0.4,
    });

    if (!ai || !Array.isArray(ai.subtasks) || ai.subtasks.length === 0) {
      return NextResponse.json({ error: "AI did not return valid subtasks" }, { status: 502 });
    }

    if (parsed.data.create) {
      const parentDetail = await prisma.task.findUnique({
        where: { id: parsed.data.taskId },
        select: { brandId: true, listId: true, clientId: true },
      });

      const created = await prisma.$transaction(
        ai.subtasks.slice(0, parsed.data.count).map((sub, idx) =>
          prisma.task.create({
            data: {
              title: sub.title.slice(0, 240),
              description: sub.description?.slice(0, 4000) ?? null,
              estimateHours: typeof sub.estimateHours === "number" && sub.estimateHours > 0 ? sub.estimateHours : null,
              parentTaskId: parsed.data.taskId,
              brandId: parentDetail?.brandId ?? null,
              listId: parentDetail?.listId ?? null,
              clientId: parentDetail?.clientId ?? null,
              creatorId: user.id,
              order: idx,
            },
          })
        )
      );

      await prisma.taskActivity.create({
        data: {
          taskId: parsed.data.taskId,
          userId: user.id,
          type: "ai_breakdown",
          payload: { count: created.length },
        },
      }).catch(() => {});

      return NextResponse.json({ subtasks: ai.subtasks, created });
    }

    return NextResponse.json({ subtasks: ai.subtasks, created: [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
