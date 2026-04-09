import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const brand = url.searchParams.get("brand");

    // Tenant scope first; query params can only narrow, never widen.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (status) where.status = status;
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { brand: { select: { code: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const lead = await prisma.lead.create({ data: body });

    await logAudit({
      action: "CREATE", entity: "Lead", entityId: lead.id, userId: user.id,
      changes: { lead: { old: null, new: { companyName: body.companyName, value: body.value } } },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
