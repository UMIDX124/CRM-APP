import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const { status } = await req.json();

    const validStatuses = ["new", "contacted", "qualified", "closed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const lead = await prisma.webLead.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(lead);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    console.error("[web-leads/patch] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
