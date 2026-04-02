import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (brand) where.brand = { code: brand };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (!isManager(user.role) && user.brandId) where.brandId = user.brandId;

    const clients = await prisma.client.findMany({
      where,
      include: { brand: { select: { code: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const client = await prisma.client.create({ data: body });

    await logAudit({
      action: "CREATE", entity: "Client", entityId: client.id, userId: user.id,
      changes: { client: { old: null, new: body } },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
