import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { sanitizeText, clampLength } from "@/lib/sanitize";

const POST_LIMIT = { limit: 30, windowSec: 60 };
const MAX_MESSAGE_LENGTH = 4000;

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
        parent: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            author: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        reactions: {
          select: { emoji: true, userId: true },
        },
        pin: { select: { id: true } },
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json({
      messages: messages.reverse().map((m) => {
        // Group reactions client-friendly
        const reactionMap: Record<string, { count: number; reactedByMe: boolean }> = {};
        for (const r of m.reactions) {
          if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, reactedByMe: false };
          reactionMap[r.emoji].count += 1;
          if (r.userId === user.id) reactionMap[r.emoji].reactedByMe = true;
        }
        return {
          id: m.id,
          content: m.deletedAt ? "" : m.content,
          deletedAt: m.deletedAt,
          editedAt: m.editedAt,
          type: m.type,
          metadata: m.metadata,
          attachments: m.attachments,
          linkPreview: m.linkPreview,
          parentMessageId: m.parentMessageId,
          parent: m.parent && !m.parent.deletedAt
            ? {
                id: m.parent.id,
                content: m.parent.content,
                authorName: `${m.parent.author.firstName} ${m.parent.author.lastName}`.trim(),
              }
            : null,
          reactions: Object.entries(reactionMap).map(([emoji, v]) => ({
            emoji,
            count: v.count,
            reactedByMe: v.reactedByMe,
          })),
          isPinned: !!m.pin,
          replyCount: m._count.replies,
          createdAt: m.createdAt,
          author: {
            id: m.author.id,
            name: `${m.author.firstName} ${m.author.lastName}`.trim(),
            avatar: m.author.avatar,
            role: m.author.role,
          },
        };
      }),
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

    // Per-user rate limit on message posts
    const limited = await rateLimit("messages", req, POST_LIMIT, user.id);
    if (!limited.success) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Slow down a bit." },
        {
          status: 429,
          headers: rateLimitHeaders(limited, POST_LIMIT),
        }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { content, type, metadata, parentMessageId, attachments } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Sanitize: strip HTML, clamp length
    const cleanContent = clampLength(sanitizeText(content), MAX_MESSAGE_LENGTH);
    if (cleanContent.length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Validate parent message belongs to same channel (if provided)
    if (parentMessageId && typeof parentMessageId === "string") {
      const parent = await prisma.message.findUnique({
        where: { id: parentMessageId },
        select: { channelId: true, deletedAt: true },
      });
      if (!parent || parent.channelId !== id || parent.deletedAt) {
        return NextResponse.json(
          { error: "Invalid parent message" },
          { status: 400 }
        );
      }
    }

    // Validate attachments shape (array of {url, name, mime, size})
    let cleanAttachments = null;
    if (Array.isArray(attachments) && attachments.length > 0) {
      cleanAttachments = attachments
        .filter(
          (a) =>
            a &&
            typeof a.url === "string" &&
            typeof a.name === "string" &&
            typeof a.mime === "string"
        )
        .slice(0, 10); // hard cap
    }

    const message = await prisma.message.create({
      data: {
        content: cleanContent,
        channelId: id,
        authorId: user.id,
        type: type || "TEXT",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        parentMessageId: parentMessageId || null,
        attachments: cleanAttachments ?? undefined,
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
    while ((match = mentionRegex.exec(cleanContent)) !== null) {
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
