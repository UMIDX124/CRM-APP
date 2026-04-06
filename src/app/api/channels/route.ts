import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/channels — list channels the user belongs to
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      where: {
        OR: [
          { type: "PUBLIC" },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        _count: { select: { members: true, messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, author: { select: { firstName: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        type: ch.type,
        memberCount: ch._count.members,
        messageCount: ch._count.messages,
        lastMessage: ch.messages[0]
          ? {
              content: ch.messages[0].content.slice(0, 80),
              author: ch.messages[0].author.firstName,
              time: ch.messages[0].createdAt,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error("Channels GET error:", err);
    return NextResponse.json({ error: "Failed to load channels" }, { status: 500 });
  }
}

// POST /api/channels — create a new channel
export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, type } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);

    const existing = await prisma.channel.findFirst({ where: { name: sanitizedName } });
    if (existing) {
      return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
    }

    const channel = await prisma.channel.create({
      data: {
        name: sanitizedName,
        description: description || null,
        type: type || "PUBLIC",
        createdById: user.id,
        members: {
          create: { userId: user.id, role: "ADMIN" },
        },
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (err) {
    console.error("Channel POST error:", err);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
