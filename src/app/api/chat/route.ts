import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { UIMessage } from "ai";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere, tenantUserWhere, type SessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// P0-5 FIX: Use real database data instead of mock-data imports
// Tenant-scoped: the assistant only ever sees rows from the caller's own
// company (or brand, for non-managers), so one tenant's chat cannot leak
// another tenant's clients, leads, or employees.

async function buildSystemPrompt(user: SessionUser): Promise<string> {
  let dataContext = "";

  try {
    const tenant = tenantWhere(user);
    const userTenant = tenantUserWhere(user);

    // Brands the caller is allowed to see — super admin sees all brands,
    // managers see all brands within their company, employees see their
    // own single brand.
    const brandWhere: Record<string, unknown> =
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "PROJECT_MANAGER" || user.role === "DEPT_HEAD"
          ? { companyId: user.companyId ?? "__none__" }
          : { id: user.brandId ?? "__none__" };

    const [brandsData, employeesData, clientsData, tasksData, leadsData] = await Promise.all([
      prisma.brand.findMany({
        where: brandWhere,
        select: { name: true, code: true, color: true, website: true },
        // Cap the brand list fed into the LLM system prompt so a tenant
        // with hundreds of brands can't blow past Groq's context window.
        take: 25,
      }),
      prisma.user.findMany({
        where: { ...userTenant, status: "ACTIVE" },
        select: { firstName: true, lastName: true, title: true, department: true, role: true, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.client.findMany({
        where: { ...tenant, status: "ACTIVE" },
        select: { companyName: true, contactName: true, mrr: true, healthScore: true, services: true, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.task.findMany({
        where: tenant,
        select: { title: true, status: true, priority: true, dueDate: true, assignee: { select: { firstName: true, lastName: true } }, client: { select: { companyName: true } }, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.lead.findMany({
        where: tenant,
        select: { companyName: true, contactName: true, status: true, value: true, source: true, probability: true },
        take: 50,
      }),
    ]);

    const totalMRR = clientsData.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const avgHealth = clientsData.length > 0 ? Math.round(clientsData.reduce((sum, c) => sum + (c.healthScore || 0), 0) / clientsData.length) : 0;
    const openTasks = tasksData.filter(t => t.status !== "COMPLETED").length;
    const wonLeads = leadsData.filter(l => l.status === "WON").length;
    const pipelineValue = leadsData.filter(l => l.status !== "LOST").reduce((sum, l) => sum + (l.value || 0), 0);

    dataContext = `
**Brands:** ${JSON.stringify(brandsData, null, 2)}

**Dashboard KPIs:**
- Total Active Clients: ${clientsData.length}
- Total MRR: $${totalMRR.toLocaleString()}
- Open Tasks: ${openTasks}
- Average Health Score: ${avgHealth}%
- Pipeline Value: $${pipelineValue.toLocaleString()}
- Won Leads: ${wonLeads}

**Employees:** ${JSON.stringify(employeesData.map(e => ({ name: `${e.firstName} ${e.lastName}`, title: e.title, brand: e.brand?.code, department: e.department, role: e.role })), null, 2)}

**Clients:** ${JSON.stringify(clientsData.map(c => ({ company: c.companyName, contact: c.contactName, brand: c.brand?.code, mrr: c.mrr, healthScore: c.healthScore, services: c.services })), null, 2)}

**Tasks:** ${JSON.stringify(tasksData.map(t => ({ title: t.title, status: t.status, priority: t.priority, assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null, client: t.client?.companyName, brand: t.brand?.code, dueDate: t.dueDate })), null, 2)}

**Leads/Pipeline:** ${JSON.stringify(leadsData.map(l => ({ company: l.companyName, contact: l.contactName, status: l.status, value: l.value, source: l.source })), null, 2)}`;
  } catch {
    dataContext = "\n\n**Note:** Database is currently unavailable. Respond based on general CRM knowledge.";
  }

  return `You are Alpha, an elite AI assistant for Alpha Command Center CRM. Alpha operates 3 companies:
- VCS (Virtual Customer Solution) - Virtual services, digital marketing
- BSL (Backup Solutions LLC) - Cloud backup, cybersecurity, tech services
- DPL (Digital Point LLC) - Performance marketing, $50M+ ad spend managed

You have full access to the CRM data including clients, employees, tasks, revenue data, dashboard KPIs, and sales pipeline.

Here is the current CRM data:
${dataContext}

Your personality:
- Professional but friendly, like a smart business partner
- Use emojis sparingly for emphasis
- Be concise but insightful
- When asked about data, summarize key insights with specific numbers
- When asked to analyze, provide actionable recommendations
- Format responses with markdown: use **bold**, bullet points, headings when appropriate
- Always respond in the language the user uses (English/Urdu/Hinglish)`;
}

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // Rate-limit AI chat: 20 requests/min/user. Groq calls cost money.
    const rl = await rateLimit("chat", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    const systemPrompt = await buildSystemPrompt(user);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const status = err instanceof Error && err.message === "Unauthorized" ? 401 : 500;
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: status === 401 ? "Unauthorized" : "Chat failed" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
