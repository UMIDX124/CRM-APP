import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { sanitizeText, clampLength } from "@/lib/sanitize";

/**
 * GET  /api/ticket-templates        — list templates (optionally filter by brand)
 * POST /api/ticket-templates        — create (manager+)
 *
 * Templates store canned replies or ticket subject+body scaffolds. Agents
 * pick one from a dropdown when composing a ticket comment; the selected
 * body is dropped into the compose box.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const category = url.searchParams.get("category");

    const where: Record<string, unknown> = { isActive: true };
    if (brand) where.brandId = brand;
    if (category) where.category = category;

    const templates = await prisma.ticketTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 200,
    });
    return NextResponse.json(templates);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Ticket templates GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth();
    if (!isManager(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const name = typeof body.name === "string" ? clampLength(sanitizeText(body.name), 120) : "";
    const templateBody = typeof body.body === "string" ? clampLength(body.body, 4000) : "";
    const subject = typeof body.subject === "string" ? clampLength(sanitizeText(body.subject), 200) : null;
    const category = typeof body.category === "string" ? clampLength(sanitizeText(body.category), 50) : null;
    const brandId = typeof body.brandId === "string" ? body.brandId : null;

    if (!name || !templateBody) {
      return NextResponse.json({ error: "name and body required" }, { status: 400 });
    }

    const template = await prisma.ticketTemplate.create({
      data: {
        name,
        body: templateBody,
        subject,
        category,
        brandId,
        createdById: actor.id,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Ticket templates POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
