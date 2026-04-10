import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.trackedSite.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[sites/delete] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
