import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";
import { renderInvoicePdf, type InvoiceLineItem } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, ...tenantWhere(user) },
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            country: true,
          },
        },
        brand: {
          select: { name: true, code: true, color: true, website: true },
        },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // items is stored as Json — coerce to an array of line items
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
    console.error("[invoices.pdf] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to generate PDF" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
