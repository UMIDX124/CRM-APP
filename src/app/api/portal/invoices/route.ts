import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portal-auth";

export async function GET() {
  try {
    const client = await requirePortalAuth();

    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      select: {
        id: true, number: true, items: true, subtotal: true, tax: true,
        total: true, status: true, issueDate: true, dueDate: true,
        paidDate: true, paymentMethod: true, notes: true,
      },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "PortalUnauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[portal/invoices]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
