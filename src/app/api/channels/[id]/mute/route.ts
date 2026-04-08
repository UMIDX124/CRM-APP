import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/channels/[id]/mute  { until?: ISODate }
 *   Mutes notifications for the current user. If `until` is omitted the
 *   mute is indefinite.
 *
 * DELETE /api/channels/[id]/mute  — unmute (idempotent)
 *
 * Mutes are stored in two places — the new ChannelMute table for richer
 * "muted until" semantics, and ChannelMember.isMuted for fast lookups
 * during notification fan-out.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const until = body.until ? new Date(body.until) : null;

    // Verify membership
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: "Not a channel member" }, { status: 403 });
    }

    // Upsert ChannelMute row
    await prisma.channelMute.upsert({
      where: { channelId_userId: { channelId: id, userId: user.id } },
      update: { mutedUntil: until },
      create: { channelId: id, userId: user.id, mutedUntil: until },
    });

    // Mirror onto ChannelMember.isMuted
    await prisma.channelMember.update({
      where: { id: member.id },
      data: { isMuted: true },
    });

    return NextResponse.json({ muted: true, until });
  } catch (err) {
    console.error("[mute] POST error:", err);
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
    await prisma.channelMute.deleteMany({
      where: { channelId: id, userId: user.id },
    });
    await prisma.channelMember.updateMany({
      where: { channelId: id, userId: user.id },
      data: { isMuted: false },
    });
    return NextResponse.json({ muted: false });
  } catch (err) {
    console.error("[mute] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
