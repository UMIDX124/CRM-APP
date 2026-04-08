import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { sanitizeText, clampLength } from "@/lib/sanitize";

async function guard() {
  const actor = await requireAuth();
  if (!isManager(actor.role)) throw new Error("Forbidden");
  return actor;
}

function errorResponse(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  console.error("Ticket template error:", err);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await guard();
    const { id } = await params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = clampLength(sanitizeText(body.name), 120);
    if (typeof body.body === "string") data.body = clampLength(body.body, 4000);
    if (typeof body.subject === "string") data.subject = clampLength(sanitizeText(body.subject), 200);
    if (typeof body.category === "string") data.category = clampLength(sanitizeText(body.category), 50);
    if (typeof body.brandId === "string" || body.brandId === null) data.brandId = body.brandId;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.ticketTemplate.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await guard();
    const { id } = await params;
    await prisma.ticketTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
