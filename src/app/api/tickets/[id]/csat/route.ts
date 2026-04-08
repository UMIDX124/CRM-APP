import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { getSession } from "@/lib/auth";
import { sanitizeText, clampLength } from "@/lib/sanitize";

/**
 * POST /api/tickets/[id]/csat  { rating: 1..5, comment?: string }
 *
 * Submits a customer satisfaction score for a resolved/closed ticket.
 * Enforces:
 *   - Ticket must exist and be RESOLVED or CLOSED
 *   - Rating must be an integer 1-5
 *   - Once submitted, further POSTs are rejected (single-use)
 *
 * The requester/assignee is the authoritative "customer" perspective; we
 * allow any authenticated session to POST since the CSAT email link lands
 * in the same app and users are already signed in.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await rateLimit("csat", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be an integer 1-5" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, status: true, csatSubmittedAt: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Ticket must be resolved before rating" },
        { status: 400 }
      );
    }
    if (ticket.csatSubmittedAt) {
      return NextResponse.json({ error: "CSAT already submitted" }, { status: 409 });
    }

    const cleanComment = comment ? clampLength(sanitizeText(comment), 1000) : null;

    await prisma.ticket.update({
      where: { id },
      data: {
        csatRating: rating,
        csatComment: cleanComment,
        csatSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, rating, comment: cleanComment });
  } catch (err) {
    console.error("[csat] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
