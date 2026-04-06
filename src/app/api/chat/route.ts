import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { UIMessage } from "ai";
import { prisma } from "@/lib/db";

// P0-5 FIX: Use real database data instead of mock-data imports

async function buildSystemPrompt(): Promise<string> {
  let dataContext = "";

  try {
    const [brandsData, employeesData, clientsData, tasksData, leadsData] = await Promise.all([
      prisma.brand.findMany({ select: { name: true, code: true, color: true, website: true } }),
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { firstName: true, lastName: true, title: true, department: true, role: true, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.client.findMany({
        where: { status: "ACTIVE" },
        select: { companyName: true, contactName: true, mrr: true, healthScore: true, services: true, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.task.findMany({
        select: { title: true, status: true, priority: true, dueDate: true, assignee: { select: { firstName: true, lastName: true } }, client: { select: { companyName: true } }, brand: { select: { code: true } } },
        take: 50,
      }),
      prisma.lead.findMany({
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
  const { messages }: { messages: UIMessage[] } = await req.json();

  const systemPrompt = await buildSystemPrompt();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
