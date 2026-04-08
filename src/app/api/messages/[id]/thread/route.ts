import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/messages/[id]/thread?cursor=&limit=
 *
 * Returns the parent message + paginated reply list for a chat thread.
 * Used by UnifiedChat's inline thread view. Membership in the channel is
 * required — non-members get 403.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);

    const parent = await prisma.message.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    });
    if (!parent) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify the requester is a member of the parent's channel
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: parent.channelId, userId: user.id } },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const replies = await prisma.message.findMany({
      where: { parentMessageId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    });

    const shape = (m: typeof replies[number]) => ({
      id: m.id,
      content: m.deletedAt ? "" : m.content,
      type: m.type,
      createdAt: m.createdAt,
      author: {
        id: m.author.id,
        name: `${m.author.firstName} ${m.author.lastName}`.trim(),
        avatar: m.author.avatar,
        role: m.author.role,
      },
    });

    return NextResponse.json({
      parent: {
        id: parent.id,
        content: parent.deletedAt ? "" : parent.content,
        channelId: parent.channelId,
        createdAt: parent.createdAt,
        author: {
          id: parent.author.id,
          name: `${parent.author.firstName} ${parent.author.lastName}`.trim(),
          avatar: parent.author.avatar,
          role: parent.author.role,
        },
      },
      replies: replies.map(shape),
      hasMore: replies.length === limit,
      nextCursor: replies.length > 0 ? replies[replies.length - 1].id : null,
    });
  } catch (err) {
    console.error("[thread] GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
