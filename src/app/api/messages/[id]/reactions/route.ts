import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_EMOJI_REGEX = /^[\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Component}]{1,4}$/u;

/**
 * POST /api/messages/[id]/reactions  { emoji }
 * Toggles a reaction — adds if missing, removes if it already exists for
 * this user. Idempotent and safe to spam-click.
 *
 * GET /api/messages/[id]/reactions
 * Returns reactions grouped by emoji with reactor names.
 */

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Group by emoji
    const groups: Record<
      string,
      { emoji: string; count: number; users: { id: string; name: string }[]; reactedByMe: boolean }
    > = {};
    for (const r of reactions) {
      const e = r.emoji;
      if (!groups[e]) groups[e] = { emoji: e, count: 0, users: [], reactedByMe: false };
      groups[e].count += 1;
      groups[e].users.push({
        id: r.user.id,
        name: `${r.user.firstName} ${r.user.lastName}`.trim(),
      });
      if (r.user.id === user.id) groups[e].reactedByMe = true;
    }

    return NextResponse.json(Object.values(groups));
  } catch (err) {
    console.error("[reactions] GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const { emoji } = await req.json();

    if (!emoji || typeof emoji !== "string" || !VALID_EMOJI_REGEX.test(emoji)) {
      return NextResponse.json(
        { error: "Invalid emoji" },
        { status: 400 }
      );
    }

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Toggle: try delete first, fall through to create
    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId: id, userId: user.id, emoji },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ added: false, emoji });
    }

    await prisma.messageReaction.create({
      data: { messageId: id, userId: user.id, emoji },
    });
    return NextResponse.json({ added: true, emoji });
  } catch (err) {
    console.error("[reactions] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
