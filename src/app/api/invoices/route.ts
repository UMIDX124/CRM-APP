import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const brand = url.searchParams.get("brand");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (brand) where.brand = { code: brand };

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        brand: { select: { code: true, color: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    // Compute isOverdue live — PENDING invoices whose dueDate has passed.
    // We do NOT persist the OVERDUE status transition here (that would
    // require a cron); instead every read derives the flag from dueDate so
    // dashboards and filters surface the real state consistently.
    const now = Date.now();
    const enriched = invoices.map((inv) => ({
      ...inv,
      isOverdue:
        inv.status === "PENDING" &&
        inv.dueDate instanceof Date &&
        inv.dueDate.getTime() < now,
    }));

    return NextResponse.json(enriched);
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
    const count = await prisma.invoice.count();
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: { ...body, number },
    });

    await logAudit({
      action: "CREATE", entity: "Invoice", entityId: invoice.id, userId: user.id,
      changes: { invoice: { old: null, new: { number, total: body.total, clientId: body.clientId } } },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
