import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, requesterId: true, assigneeId: true, firstResponseAt: true, status: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        authorId: user.id,
        content: body.content,
        isInternal: Boolean(body.isInternal),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    // First response timestamp + auto-move OPEN → IN_PROGRESS on staff reply
    if (!ticket.firstResponseAt && !comment.isInternal) {
      await prisma.ticket.update({
        where: { id },
        data: {
          firstResponseAt: new Date(),
          ...(ticket.status === "OPEN" ? { status: "IN_PROGRESS" } : {}),
        },
      });
    }

    // Notify the other party
    const notifyTarget =
      user.id === ticket.requesterId ? ticket.assigneeId : ticket.requesterId;
    if (notifyTarget && !comment.isInternal) {
      await prisma.notification
        .create({
          data: {
            title: "New ticket reply",
            message: body.content.slice(0, 120),
            type: "ticket",
            userId: notifyTarget,
            data: { ticketId: id, commentId: comment.id },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
