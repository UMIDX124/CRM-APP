import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { groqText } from "@/lib/groq";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("tasks-ai-standup", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId") || user.id;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const yesterday = new Date(dayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    const [completedYesterday, inProgress, dueToday, blocked] = await Promise.all([
      prisma.task.findMany({
        where: {
          assigneeId: targetUserId,
          status: "COMPLETED",
          completedAt: { gte: yesterday, lt: dayStart },
        },
        select: { title: true, priority: true },
        take: 20,
      }),
      prisma.task.findMany({
        where: { assigneeId: targetUserId, status: "IN_PROGRESS" },
        select: { title: true, priority: true, dueDate: true },
        take: 20,
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: targetUserId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { gte: dayStart, lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
        },
        select: { title: true, priority: true },
        take: 20,
      }),
      prisma.task.findMany({
        where: { assigneeId: targetUserId, status: "BLOCKED" },
        select: { title: true },
        take: 20,
      }),
    ]);

    const summary = {
      completedYesterday: completedYesterday.length,
      inProgress: inProgress.length,
      dueToday: dueToday.length,
      blocked: blocked.length,
    };

    const ai = await groqText({
      system: `You write friendly, concise daily standups for a team member. Three sections: yesterday, today, blockers. Two sentences per section, no fluff. First-person voice. If a section has no items, say "Nothing to report" — don't make things up.`,
      prompt: `Generate a daily standup from these tasks.

Completed yesterday (${completedYesterday.length}):
${completedYesterday.map((t) => `- [${t.priority}] ${t.title}`).join("\n") || "(none)"}

In progress now (${inProgress.length}):
${inProgress.map((t) => `- [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate.toISOString().slice(0, 10)})` : ""}`).join("\n") || "(none)"}

Due today (${dueToday.length}):
${dueToday.map((t) => `- [${t.priority}] ${t.title}`).join("\n") || "(none)"}

Blocked (${blocked.length}):
${blocked.map((t) => `- ${t.title}`).join("\n") || "(none)"}

Format as plain text with three short paragraphs (Yesterday, Today, Blockers).`,
      maxOutputTokens: 500,
      temperature: 0.6,
    });

    return NextResponse.json({ standup: ai, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
