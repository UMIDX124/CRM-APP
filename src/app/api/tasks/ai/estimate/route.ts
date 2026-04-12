import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { ensureTaskAccess } from "@/lib/task-access";
import { groqJson } from "@/lib/groq";

const bodySchema = z.object({
  taskId: z.string().min(1),
  save: z.boolean().optional().default(false),
});

type EstimateResponse = {
  hours: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("tasks-ai-estimate", req, { limit: 15, windowSec: 60 }, user.id);
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
      select: {
        title: true,
        description: true,
        priority: true,
        department: true,
        checklist: { select: { content: true, done: true } },
        subtasks: { select: { title: true, status: true } },
      },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const ai = await groqJson<EstimateResponse>({
      system: `You estimate engineering/work hours for tasks. Be realistic, not optimistic. Include time for testing, review, and unexpected issues. Confidence reflects how well-defined the task is.`,
      prompt: `Estimate hours for this task.

Title: ${task.title}
Priority: ${task.priority}
Department: ${task.department || "unspecified"}
${task.description ? `Description: ${task.description}` : ""}
${task.checklist.length ? `Checklist (${task.checklist.length} items):\n${task.checklist.map((c) => `${c.done ? "[x]" : "[ ]"} ${c.content}`).join("\n")}` : ""}
${task.subtasks.length ? `Subtasks: ${task.subtasks.length}` : ""}

Output JSON:
{ "hours": number (0.5 - 80), "confidence": "low" | "medium" | "high", "reasoning": "1-2 sentences" }`,
      maxOutputTokens: 250,
      temperature: 0.3,
    });

    if (!ai || typeof ai.hours !== "number" || ai.hours <= 0) {
      return NextResponse.json({ error: "AI did not return a valid estimate" }, { status: 502 });
    }

    if (parsed.data.save) {
      await prisma.task.update({
        where: { id: parsed.data.taskId },
        data: { estimateHours: ai.hours },
      });
      await prisma.taskActivity.create({
        data: {
          taskId: parsed.data.taskId,
          userId: user.id,
          type: "ai_estimate",
          payload: { hours: ai.hours, confidence: ai.confidence },
        },
      }).catch(() => {});
    }

    return NextResponse.json(ai);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
