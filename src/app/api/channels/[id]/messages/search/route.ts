import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/channels/[id]/messages/search?q=<term>&limit=20
 *
 * Postgres ILIKE search across non-deleted messages in a channel. We use
 * ILIKE rather than tsvector here so the migration doesn't have to add a
 * generated column — it's plenty fast for the channel-scoped use case
 * (already indexed by channelId via @@index([channelId, createdAt])).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

    if (!q || q.length < 2) {
      return NextResponse.json({ messages: [] });
    }

    // Membership check (don't leak content from channels you're not in)
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: user.id } },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a channel member" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
        deletedAt: null,
        content: { contains: q, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        author: {
          id: m.author.id,
          name: `${m.author.firstName} ${m.author.lastName}`.trim(),
          avatar: m.author.avatar,
        },
      })),
    });
  } catch (err) {
    console.error("[search] GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
