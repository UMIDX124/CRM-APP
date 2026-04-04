import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
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
    await logAudit({ action: "UPDATE", entity: "Task", entityId: id, userId: "system", changes: body }).catch(() => {});
    return NextResponse.json(task);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    await logAudit({ action: "DELETE", entity: "Task", entityId: id, userId: "system" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
