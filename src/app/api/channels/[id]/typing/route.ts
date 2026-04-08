import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/channels/[id]/typing
 *
 * Mark the current user as "typing" in this channel for the next ~10
 * seconds. Clients should re-POST every ~5s while the user is actively
 * composing so the indicator stays alive; the events stream polls the
 * `typingUntil` column and fans the deltas out over SSE.
 *
 * DELETE /api/channels/[id]/typing
 * Immediately clears the typing flag (e.g. on send or blur).
 */
const TYPING_TTL_MS = 10_000;

async function ensureMembership(userId: string, channelId: string) {
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  return member;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const member = await ensureMembership(user.id, channelId);
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    await prisma.channelMember.update({
      where: { id: member.id },
      data: { typingUntil: new Date(Date.now() + TYPING_TTL_MS) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[typing] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const member = await ensureMembership(user.id, channelId);
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    await prisma.channelMember.update({
      where: { id: member.id },
      data: { typingUntil: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[typing] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
