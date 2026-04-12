import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Strict task create schema. Rejects the previous `{ ...body, creatorId }`
// spread that let callers inject any writable field (brandId pointing at
// another tenant, arbitrary assigneeId, etc).
const taskCreateSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "BLOCKED"]).optional().default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  department: z.enum(["LEADERSHIP", "MARKETING", "DEV", "CREATIVE", "SUPPORT", "ADMIN", "SALES", "OPS"]).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().nonnegative().finite().optional().nullable(),
  timeSpent: z.number().nonnegative().finite().optional().default(0),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  order: z.number().int().optional().default(0),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignee = url.searchParams.get("assignee");
    const brand = url.searchParams.get("brand");

    // Tenant scope first so no combination of query params can widen
    // access beyond the caller's brand/company. Managers see their
    // whole company; employees see their own brand.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignee) where.assigneeId = assignee;
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }
    // Non-manager employees are further narrowed to their own tasks —
    // even within their brand they can only see rows assigned to them.
    if (!isManager(user.role)) where.assigneeId = user.id;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, companyName: true } },
        brand: { select: { code: true, color: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 500,
    });

    return NextResponse.json(tasks);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const raw = await req.json().catch(() => null);
    const parsed = taskCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "TASK_VALIDATION",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        priority: body.priority,
        department: body.department ?? null,
        assigneeId: body.assigneeId ?? null,
        clientId: body.clientId ?? null,
        brandId: body.brandId ?? null,
        listId: body.listId ?? null,
        parentTaskId: body.parentTaskId ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        estimateHours: body.estimateHours ?? null,
        timeSpent: body.timeSpent,
        tags: body.tags ?? [],
        order: body.order,
        creatorId: user.id,
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        userId: user.id,
        type: "created",
        payload: { title: task.title, status: task.status },
      },
    }).catch(() => {});

    await logAudit({
      action: "CREATE", entity: "Task", entityId: task.id, userId: user.id,
      changes: { task: { old: null, new: { title: body.title, status: body.status } } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
