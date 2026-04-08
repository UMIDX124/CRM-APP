import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/companies?active=true
 *
 * Lists all companies (parent organizations). Used by the company switcher
 * so it doesn't have to hardcode FU/VCS/BSL/DPL.
 */
export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const onlyActive = url.searchParams.get("active") === "true";

    const companies = await prisma.company.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        brands: {
          select: { id: true, name: true, code: true, color: true },
        },
        _count: { select: { brands: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(companies);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
