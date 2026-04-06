import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// GET /api/channels/:id/messages — fetch messages for a channel
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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const messages = await prisma.message.findMany({
      where: { channelId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      messages: messages.reverse().map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        metadata: m.metadata,
        createdAt: m.createdAt,
        author: {
          id: m.author.id,
          name: `${m.author.firstName} ${m.author.lastName}`.trim(),
          avatar: m.author.avatar,
          role: m.author.role,
        },
      })),
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  } catch (err) {
    console.error("Messages GET error:", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

// POST /api/channels/:id/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content, type, metadata } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        channelId: id,
        authorId: user.id,
        type: type || "TEXT",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    });

    // Handle @mentions — find @firstName patterns and notify those users
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const mentionedUser = await prisma.user.findFirst({
        where: {
          firstName: { equals: mentionedName, mode: "insensitive" },
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (mentionedUser && mentionedUser.id !== user.id) {
        await createNotification({
          type: "MENTION",
          title: "You were mentioned",
          message: `${user.firstName} mentioned you in #${channel.name}`,
          userId: mentionedUser.id,
          data: { channelId: id, messageId: message.id, link: `/chat?channel=${id}` },
        });
      }
    }

    return NextResponse.json({
      id: message.id,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      createdAt: message.createdAt,
      author: {
        id: message.author.id,
        name: `${message.author.firstName} ${message.author.lastName}`.trim(),
        avatar: message.author.avatar,
        role: message.author.role,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Message POST error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
