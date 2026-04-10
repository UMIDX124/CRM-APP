import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.webLead.findMany({
        where,
        include: { site: { select: { name: true, domain: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webLead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[web-leads] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
