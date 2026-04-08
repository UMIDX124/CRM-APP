import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(deliveries);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
