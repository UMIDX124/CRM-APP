import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/messages/[id]/pin    — pin (idempotent)
 * DELETE /api/messages/[id]/pin  — unpin (idempotent)
 *
 * Any channel member can pin/unpin (we keep it permissive — admins can
 * tighten via UI).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, channelId: true, deletedAt: true },
    });
    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Membership check
    const member = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: message.channelId, userId: user.id },
      },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Upsert pin (messageId is unique)
    const pin = await prisma.messagePin.upsert({
      where: { messageId: id },
      update: {},
      create: {
        messageId: id,
        channelId: message.channelId,
        pinnedById: user.id,
      },
    });
    return NextResponse.json({ pinned: true, id: pin.id });
  } catch (err) {
    console.error("[pin] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const message = await prisma.message.findUnique({
      where: { id },
      select: { channelId: true },
    });
    if (!message) {
      return NextResponse.json({ ok: true });
    }
    const member = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: message.channelId, userId: user.id },
      },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    await prisma.messagePin.deleteMany({ where: { messageId: id } });
    return NextResponse.json({ pinned: false });
  } catch (err) {
    console.error("[pin] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
