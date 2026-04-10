import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    const sites = await prisma.trackedSite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pageViews: true, webLeads: true } },
      },
    });

    return NextResponse.json(sites);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[sites] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();

    const { name, domain } = await req.json();
    if (!name || !domain) {
      return NextResponse.json({ error: "Name and domain are required" }, { status: 400 });
    }

    const site = await prisma.trackedSite.create({
      data: { name, domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, "") },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[sites] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
