import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiGenerate, extractJson } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const schema = z.object({
  notes: z.string().min(10, "Paste at least 10 characters of meeting notes"),
  clientId: z.string().optional().nullable(),
  createTasks: z.boolean().optional(),
});

interface LlmResponse {
  summary: string;
  decisions: string[];
  actionItems: Array<{
    title: string;
    assignee?: string | null;
    dueDate?: string | null;
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }>;
  followUps: string[];
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("ai-meeting-notes", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit: 10 requests per minute" }, { status: 429 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    // Validate client access if clientId is provided
    let client: { id: string; companyName: string; brandId: string } | null = null;
    if (parsed.data.clientId) {
      const found = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, ...tenantWhere(user) },
        select: { id: true, companyName: true, brandId: true },
      });
      if (!found) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      client = found;
    }

    const system = `You are a meticulous executive assistant. Given raw meeting notes, extract structured information and return ONLY valid JSON (no markdown, no code fences) with this exact shape:

{
  "summary": "2-3 sentence summary of the meeting",
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {"title": "specific action", "assignee": "person name or null", "dueDate": "YYYY-MM-DD or null", "priority": "LOW|MEDIUM|HIGH"}
  ],
  "followUps": ["follow-up topic 1", "follow-up topic 2"]
}

Rules:
- actionItems must be concrete and actionable ("Send pricing doc to Alex by Friday" not "discuss pricing")
- Use null for unknown assignee or dueDate
- Convert relative dates ("Friday", "next week") to ISO YYYY-MM-DD using today's date: ${new Date().toISOString().slice(0, 10)}
- If no decisions were made, return []
- Keep summary under 400 characters`;

    const result = await aiGenerate({
      system,
      prompt: `Meeting notes:\n${parsed.data.notes}`,
      temperature: 0.3,
      maxTokens: 1200,
    });

    const extracted = extractJson<LlmResponse>(result.text);
    if (!extracted) {
      return NextResponse.json(
        { error: "AI returned an unparseable response — try again" },
        { status: 502 }
      );
    }

    // Normalize
    const summary = (extracted.summary || "").trim();
    const decisions = Array.isArray(extracted.decisions) ? extracted.decisions.filter(Boolean) : [];
    const actionItems = Array.isArray(extracted.actionItems)
      ? extracted.actionItems.filter((a) => a && typeof a.title === "string")
      : [];
    const followUps = Array.isArray(extracted.followUps) ? extracted.followUps.filter(Boolean) : [];

    // Optionally create tasks from action items
    const createdTasks: Array<{ id: string; title: string }> = [];
    if (parsed.data.createTasks && actionItems.length > 0) {
      for (const item of actionItems) {
        try {
          const dueDate =
            item.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) ? new Date(item.dueDate) : null;
          const priority = item.priority === "HIGH" ? "HIGH" : item.priority === "LOW" ? "LOW" : "MEDIUM";
          const task = await prisma.task.create({
            data: {
              title: item.title.slice(0, 200),
              status: "TODO",
              priority,
              dueDate,
              creatorId: user.id,
              clientId: client?.id || null,
              brandId: client?.brandId || user.brandId || null,
            },
            select: { id: true, title: true },
          });
          createdTasks.push(task);
        } catch (err) {
          console.error("[ai.meeting-notes] task create error:", err);
        }
      }
    }

    // Save summary to client notes if a client is linked
    if (client && summary) {
      try {
        await prisma.note.create({
          data: {
            content: `Meeting notes (AI summary)\n\n${summary}\n\nDecisions:\n${decisions.map((d) => `• ${d}`).join("\n") || "—"}\n\nFollow-ups:\n${followUps.map((f) => `• ${f}`).join("\n") || "—"}`,
            clientId: client.id,
            authorId: user.id,
          },
        });
      } catch (err) {
        console.error("[ai.meeting-notes] note create error:", err);
      }
    }

    return NextResponse.json({
      summary,
      decisions,
      actionItems,
      followUps,
      createdTasks,
      model: result.model,
      attempts: result.attempts,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai.meeting-notes] error:", msg);
    const code = (e as { code?: string })?.code;
    const status = msg === "Unauthorized" ? 401 : code === "AI_NOT_CONFIGURED" ? 503 : 500;
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : code === "AI_NOT_CONFIGURED"
          ? "AI features are not configured on this deployment"
          : "Failed to process meeting notes";
    return NextResponse.json({ error: safe }, { status });
  }
}
