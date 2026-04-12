import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portal-auth";
import { renderInvoicePdf, type InvoiceLineItem } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await requirePortalAuth();
    const { id } = await params;

    // Portal clients can only access their own invoices
    const invoice = await prisma.invoice.findFirst({
      where: { id, clientId: client.id },
      include: {
        client: {
          select: { companyName: true, contactName: true, email: true, phone: true, country: true },
        },
        brand: { select: { name: true, code: true, color: true, website: true } },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
    const items: InvoiceLineItem[] = rawItems
      .map((item): InvoiceLineItem | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return {
          description: String(row.description ?? ""),
          quantity: Number(row.quantity ?? 1),
          rate: Number(row.rate ?? 0),
        };
      })
      .filter((x): x is InvoiceLineItem => x !== null);

    const pdf = renderInvoicePdf({
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      notes: invoice.notes,
      client: invoice.client,
      brand: invoice.brand,
    });

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "PortalUnauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[portal.invoice.pdf] error:", msg);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
