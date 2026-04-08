import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * POST /api/channels/dm  { userId }
 *
 * Find-or-create a DIRECT-type channel between the current user and the
 * target user. Channel name is `dm-<sortedUserIds>` so re-creation always
 * lands on the same row. Both users are added as members on creation.
 */
export async function POST(req: Request) {
  try {
    const me = await getSession();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId: peerId } = await req.json();
    if (!peerId || typeof peerId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (peerId === me.id) {
      return NextResponse.json(
        { error: "Cannot DM yourself" },
        { status: 400 }
      );
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, isActive: true },
    });
    if (!peer || !peer.isActive) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Deterministic channel name
    const sorted = [me.id, peerId].sort();
    const dmName = `dm-${sorted[0]}-${sorted[1]}`;

    // Try to find existing
    const existing = await prisma.channel.findFirst({
      where: { name: dmName, type: "DIRECT" },
      include: { members: { select: { userId: true } } },
    });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        name: existing.name,
        type: existing.type,
        existing: true,
      });
    }

    // Create new DM channel + both members
    const channel = await prisma.channel.create({
      data: {
        name: dmName,
        type: "DIRECT",
        createdById: me.id,
        members: {
          createMany: {
            data: [
              { userId: me.id, role: "ADMIN" },
              { userId: peerId, role: "ADMIN" },
            ],
          },
        },
      },
    });

    return NextResponse.json(
      { id: channel.id, name: channel.name, type: channel.type, existing: false },
      { status: 201 }
    );
  } catch (err) {
    console.error("[dm] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
