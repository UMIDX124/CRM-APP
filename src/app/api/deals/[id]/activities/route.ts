import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const VALID_TYPES = [
  "NOTE",
  "STAGE_CHANGE",
  "EMAIL",
  "CALL",
  "MEETING",
  "TASK",
  "ATTACHMENT",
] as const;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }
    const type =
      body.type && VALID_TYPES.includes(body.type) ? body.type : "NOTE";

    const deal = await prisma.deal.findUnique({ where: { id }, select: { id: true } });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const activity = await prisma.dealActivity.create({
      data: {
        dealId: id,
        userId: user.id,
        type,
        content: body.content,
        metadata: body.metadata ?? undefined,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
