import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { ensureTaskAccess } from "@/lib/task-access";
import { groqText } from "@/lib/groq";

const bodySchema = z.object({
  taskId: z.string().min(1),
  save: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("tasks-ai-summarize", req, { limit: 15, windowSec: 60 }, user.id);
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
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { author: { select: { firstName: true, lastName: true } } },
        },
        checklist: { orderBy: { order: "asc" } },
        subtasks: { select: { title: true, status: true } },
      },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const checklistText = task.checklist
      .map((c) => `${c.done ? "[x]" : "[ ]"} ${c.content}`)
      .join("\n");
    const subtasksText = task.subtasks
      .map((s) => `- (${s.status}) ${s.title}`)
      .join("\n");
    const commentsText = task.comments
      .map((c) => `${c.author.firstName} ${c.author.lastName}: ${c.content}`)
      .join("\n\n");

    const summary = await groqText({
      system: `You summarize work-task threads for busy managers. One short paragraph (3-5 sentences). Focus on: current state, key decisions, what's left, blockers if any. No markdown, no fluff, no greeting.`,
      prompt: `Summarize this task.

Title: ${task.title}
Status: ${task.status}
Priority: ${task.priority}
${task.description ? `Description: ${task.description}` : ""}

${checklistText ? `Checklist:\n${checklistText}\n` : ""}
${subtasksText ? `Subtasks:\n${subtasksText}\n` : ""}
${commentsText ? `Comment thread:\n${commentsText}\n` : ""}

Write a 3-5 sentence summary in plain text.`,
      maxOutputTokens: 350,
      temperature: 0.4,
    });

    if (parsed.data.save) {
      await prisma.task.update({
        where: { id: parsed.data.taskId },
        data: { aiSummary: summary },
      });
    }

    return NextResponse.json({ summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
