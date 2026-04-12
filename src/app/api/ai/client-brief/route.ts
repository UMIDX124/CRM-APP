import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { aiGenerate } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({ clientId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const rl = await rateLimit("ai-client-brief", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit: 10 requests per minute" },
        { status: 429 }
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, ...tenantWhere(user) },
      include: {
        brand: { select: { code: true, name: true } },
        invoices: {
          select: { status: true, total: true, dueDate: true, paidDate: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        tasks: {
          select: { status: true, priority: true, title: true, completedAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        tickets: {
          select: { status: true, priority: true, subject: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openTickets = client.tickets.filter((t) => String(t.status) !== "RESOLVED" && String(t.status) !== "CLOSED").length;
    const overdueInvoices = client.invoices.filter((i) => i.status === "OVERDUE").length;
    const paidInvoices = client.invoices.filter((i) => i.status === "PAID");
    const paidTotal = paidInvoices.reduce((s, i) => s + i.total, 0);
    const completedTasks = client.tasks.filter((t) => t.status === "COMPLETED").length;
    const activeTasks = client.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "BLOCKED").length;

    const context = [
      `Company: ${client.companyName}`,
      `Primary contact: ${client.contactName} (${client.email})`,
      client.country ? `Country: ${client.country}` : null,
      client.brand ? `Brand: ${client.brand.name} (${client.brand.code})` : null,
      `Status: ${client.status}`,
      `Health score: ${client.healthScore}/100`,
      `MRR: $${client.mrr.toFixed(2)}`,
      `Services: ${client.services.length > 0 ? client.services.join(", ") : "none"}`,
      `Invoices: ${paidInvoices.length} paid ($${paidTotal.toFixed(2)}), ${overdueInvoices} overdue, ${client.invoices.length - paidInvoices.length - overdueInvoices} pending`,
      `Tasks: ${completedTasks} completed, ${activeTasks} active`,
      `Tickets: ${client.tickets.length} total, ${openTickets} open`,
    ]
      .filter(Boolean)
      .join("\n");

    const system = `You are a senior account manager at a digital services agency. Produce a concise executive brief (3-5 sentences, plain text, no markdown, no bullets) that a director can read in 20 seconds. Cover: current relationship status, risks or wins, and one suggested next action. Be specific — reference actual numbers from the data. Do not invent facts. Do not use corporate jargon like "leverage", "synergy", "circle back".`;

    const prompt = `Client data:\n${context}\n\nWrite the executive brief now.`;

    const result = await aiGenerate({ system, prompt, temperature: 0.6, maxTokens: 400 });

    return NextResponse.json({
      clientId: client.id,
      brief: result.text.trim(),
      model: result.model,
      attempts: result.attempts,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[ai.client-brief] error:", msg);
    const code = (e as { code?: string })?.code;
    const status = msg === "Unauthorized" ? 401 : code === "AI_NOT_CONFIGURED" ? 503 : 500;
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : code === "AI_NOT_CONFIGURED"
          ? "AI features are not configured on this deployment"
          : "Failed to generate client brief";
    return NextResponse.json({ error: safe }, { status });
  }
}
