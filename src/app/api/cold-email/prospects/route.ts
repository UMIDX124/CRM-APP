import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET — fetch prospects by IDs (used by campaign wizard)
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ prospects: [] });
    }

    const ids = idsParam.split(",").filter(Boolean).slice(0, 200);

    const where: Record<string, unknown> = {
      id: { in: ids },
    };
    if (user.companyId) {
      where.companyId = user.companyId;
    }

    const prospects = await prisma.prospect.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        website: true,
        niche: true,
        city: true,
        emailStatus: true,
        googleRating: true,
        reviewCount: true,
      },
    });

    return NextResponse.json({ prospects });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/cold-email/prospects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
