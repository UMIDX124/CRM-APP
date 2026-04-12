import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { groqJson } from "@/lib/groq";

const bodySchema = z.object({
  text: z.string().min(3).max(1000),
  brandId: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  create: z.boolean().optional().default(true),
});

type ParsedTask = {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assigneeHint?: string | null;
  tags?: string[];
};

function normalizePriority(p?: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  const v = (p || "").toUpperCase();
  if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") return v;
  return "MEDIUM";
}

function safeDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("tasks-ai-quick-add", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const ai = await groqJson<ParsedTask>({
      system: `You convert natural-language work requests into structured tasks. Extract title, description, priority, due date, assignee hint, and tags. Today is ${today}. Resolve relative dates ("tomorrow", "next Friday", "in 3 days") to absolute YYYY-MM-DD.`,
      prompt: `Convert this into a task. Be concise. If a field isn't mentioned, omit it (don't guess).

Input: ${parsed.data.text}

Output JSON:
{
  "title": "string (required, max 200 chars)",
  "description": "string (optional)",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "dueDate": "YYYY-MM-DD or null",
  "assigneeHint": "name or role mentioned, or null",
  "tags": ["max 5 short tags"]
}`,
      maxOutputTokens: 400,
      temperature: 0.2,
    });

    if (!ai || !ai.title) {
      return NextResponse.json({ error: "AI did not return a valid task" }, { status: 502 });
    }

    // Try to resolve assignee by hint (first/last name match within company)
    let assigneeId: string | null = null;
    if (ai.assigneeHint && user.companyId) {
      const hint = ai.assigneeHint.trim().toLowerCase();
      const candidate = await prisma.user.findFirst({
        where: {
          isActive: true,
          brand: { companyId: user.companyId },
          OR: [
            { firstName: { contains: hint, mode: "insensitive" } },
            { lastName: { contains: hint, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      assigneeId = candidate?.id ?? null;
    }

    if (!parsed.data.create) {
      return NextResponse.json({
        parsed: ai,
        resolvedAssigneeId: assigneeId,
        created: null,
      });
    }

    const task = await prisma.task.create({
      data: {
        title: ai.title.slice(0, 240),
        description: ai.description?.slice(0, 4000) ?? null,
        priority: normalizePriority(ai.priority),
        dueDate: safeDate(ai.dueDate),
        assigneeId: assigneeId,
        brandId: parsed.data.brandId ?? user.brandId ?? null,
        listId: parsed.data.listId ?? null,
        tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 10).map((t) => String(t).slice(0, 50)) : [],
        creatorId: user.id,
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        userId: user.id,
        type: "ai_quick_add",
        payload: { source: parsed.data.text.slice(0, 200) },
      },
    }).catch(() => {});

    return NextResponse.json({ parsed: ai, resolvedAssigneeId: assigneeId, created: task }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
