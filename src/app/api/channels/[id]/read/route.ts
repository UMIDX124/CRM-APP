import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/channels/[id]/read
 *
 * Marks every message in a channel as read for the current user by
 * writing `ChannelMember.lastReadAt = now()`. The channels list
 * endpoint computes unread counts as `messages.createdAt > lastReadAt`,
 * so updating this timestamp clears the unread badge immediately on the
 * next /api/channels poll.
 *
 * Only members of the channel can mark it read (404 for non-members
 * instead of 403 to avoid leaking which channels exist).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await params;

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.channelMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[channels read] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
