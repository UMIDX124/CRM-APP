import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel } from "@/lib/notifications";
import { requireAuth, tenantWhere } from "@/lib/auth";

function unauthorized(e: unknown) {
  if (e instanceof Error && e.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Tenant ownership check — prevents cross-tenant PATCH.
    const existing = await prisma.task.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate enum values before DB write
    const VALID_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED", "BLOCKED"];
    const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}. Valid values: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: `Invalid priority: ${body.priority}` }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.clientId !== undefined && { clientId: body.clientId }),
        ...(body.brandId !== undefined && { brandId: body.brandId }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.timeSpent !== undefined && { timeSpent: body.timeSpent }),
        ...(body.status === "COMPLETED" && { completedAt: new Date() }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, companyName: true } },
        brand: { select: { code: true, color: true } },
      },
    });
    await logAudit({ action: "UPDATE", entity: "Task", entityId: id, userId: actor.id, changes: body }).catch(() => {});

    // Notify on status changes and assignments
    if (body.status === "COMPLETED" && task.assignee) {
      const assigneeName = `${task.assignee.firstName} ${task.assignee.lastName}`.trim();
      createNotification({ type: "TASK_STATUS", title: "Task Completed", message: `${assigneeName} completed "${task.title}"`, userId: "all", data: { taskId: id } });
      autoPostToChannel("tasks", `✅ **${assigneeName}** completed "${task.title}"${task.client ? ` for ${task.client.companyName}` : ""}`, task.assignee.id, "TASK_UPDATE", { taskId: id });
    }
    if (body.assigneeId && task.assignee) {
      createNotification({ type: "TASK_ASSIGNED", title: "Task Assigned", message: `You've been assigned: "${task.title}"`, userId: body.assigneeId, data: { taskId: id } });
    }

    return NextResponse.json(task);
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    console.error("Task update error:", e);
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const existing = await prisma.task.findFirst({
      where: { id, ...tenantWhere(actor) },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete child records first to avoid FK constraint violations
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { taskId: id } }),
      prisma.attachment.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);

    await logAudit({ action: "DELETE", entity: "Task", entityId: id, userId: actor.id }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const u = unauthorized(e); if (u) return u;
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("Task delete error:", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
