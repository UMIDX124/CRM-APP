import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        brand: { select: { code: true, color: true } },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json(webhook);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "name",
      "url",
      "description",
      "events",
      "isActive",
      "brandId",
      "secret",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    if ("url" in updateData && typeof updateData.url === "string") {
      try {
        new URL(updateData.url);
      } catch {
        return NextResponse.json(
          { error: "url must be a valid URL" },
          { status: 400 }
        );
      }
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      action: "UPDATE",
      entity: "Webhook",
      entityId: id,
      userId: user.id,
      changes: updateData,
    });

    return NextResponse.json(webhook);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    await prisma.webhook.delete({ where: { id } });
    await logAudit({
      action: "DELETE",
      entity: "Webhook",
      entityId: id,
      userId: user.id,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
