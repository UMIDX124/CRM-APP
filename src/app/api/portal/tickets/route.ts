import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/portal-auth";

// GET — list tickets for the authenticated portal client
export async function GET(req: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { clientId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        channel: t.channel,
        assignee: t.assignee
          ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim()
          : null,
        commentCount: t._count.comments,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedAt: t.resolvedAt,
      }))
    );
  } catch (err) {
    console.error("[portal/tickets GET]", err);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}

// POST — client creates a new support ticket from the portal
export async function POST(req: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description, priority } = body;

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: subject.trim().slice(0, 300),
        description: (description || "").trim().slice(0, 5000),
        priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority) ? priority : "MEDIUM",
        status: "OPEN",
        channel: "WEB",
        clientId: session.id,
        requesterId: null,
        assigneeId: null,
      },
    });

    return NextResponse.json({ ok: true, ticketId: ticket.id }, { status: 201 });
  } catch (err) {
    console.error("[portal/tickets POST]", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
