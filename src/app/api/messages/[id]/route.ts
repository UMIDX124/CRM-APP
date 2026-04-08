import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeText, clampLength } from "@/lib/sanitize";
import { rateLimit } from "@/lib/ratelimit";

const EDIT_LIMIT = { limit: 10, windowSec: 60 };
const MAX_MESSAGE_LENGTH = 4000;

/**
 * PATCH /api/messages/[id]
 *
 * Edit a message. Only the original author can edit. Sets `editedAt`.
 * Sanitizes content the same way the POST does.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = await rateLimit("messages-edit", req, EDIT_LIMIT, user.id);
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many edits, slow down" },
        { status: 429 }
      );
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const content = clampLength(sanitizeText(body.content || ""), MAX_MESSAGE_LENGTH);
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const existing = await prisma.message.findUnique({
      where: { id },
      select: { authorId: true, deletedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Cannot edit a deleted message" },
        { status: 400 }
      );
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      editedAt: updated.editedAt,
      author: {
        id: updated.author.id,
        name: `${updated.author.firstName} ${updated.author.lastName}`.trim(),
        avatar: updated.author.avatar,
        role: updated.author.role,
      },
    });
  } catch (err) {
    console.error("[messages] PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/[id]
 *
 * Soft delete — sets `deletedAt`. Author or channel admin only.
 * Content is overwritten with empty string so the tombstone client-side
 * can render "Message deleted" without leaking the original text.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const existing = await prisma.message.findUnique({
      where: { id },
      select: { authorId: true, channelId: true, deletedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ ok: true }); // idempotent
    }

    // Permission: author OR channel admin
    let allowed = existing.authorId === user.id;
    if (!allowed) {
      const member = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: existing.channelId, userId: user.id },
        },
        select: { role: true },
      });
      allowed = member?.role === "ADMIN";
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date(), content: "" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[messages] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
