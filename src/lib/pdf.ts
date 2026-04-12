/**
 * PDF generation helpers built on jspdf + jspdf-autotable.
 *
 * Runs in Node (Vercel Function) — NOT in the Edge runtime. Return a Buffer
 * that Next.js can stream back as `application/pdf`.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoicePdfInput {
  number: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  client: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
    country?: string | null;
  };
  brand: {
    name: string;
    code: string;
    color?: string | null;
    website?: string | null;
  };
}

const GOLD: [number, number, number] = [245, 158, 11]; // #F59E0B
const CHARCOAL: [number, number, number] = [13, 13, 13]; // #0D0D0D
const MUTED: [number, number, number] = [113, 113, 122];
const LIGHT: [number, number, number] = [245, 245, 245];

export function renderInvoicePdf(input: InvoicePdfInput): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ── Header band ────────────────────────────────────────────
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, pageWidth, 80, "F");

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(input.brand.name, margin, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(input.brand.code, margin, 58);
  if (input.brand.website) {
    doc.text(input.brand.website, margin, 72);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  const invoiceLabel = "INVOICE";
  const labelWidth = doc.getTextWidth(invoiceLabel);
  doc.text(invoiceLabel, pageWidth - margin - labelWidth, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const numberText = `#${input.number}`;
  const numberWidth = doc.getTextWidth(numberText);
  doc.text(numberText, pageWidth - margin - numberWidth, 58);

  // ── Bill-to & dates ────────────────────────────────────────
  let y = 120;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  doc.text("INVOICE DATE", pageWidth - margin - 160, y);
  doc.text("DUE DATE", pageWidth - margin - 80, y);

  y += 14;
  doc.setTextColor(...CHARCOAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(input.client.companyName, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(fmtDate(input.issueDate), pageWidth - margin - 160, y);
  doc.text(fmtDate(input.dueDate), pageWidth - margin - 80, y);

  y += 12;
  doc.text(input.client.contactName, margin, y);
  y += 12;
  doc.text(input.client.email, margin, y);
  if (input.client.phone) {
    y += 12;
    doc.text(input.client.phone, margin, y);
  }
  if (input.client.country) {
    y += 12;
    doc.text(input.client.country, margin, y);
  }

  // ── Items table ────────────────────────────────────────────
  const tableStartY = y + 30;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: input.items.map((item) => [
      item.description,
      String(item.quantity),
      fmtMoney(item.rate),
      fmtMoney(item.quantity * item.rate),
    ]),
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 8,
      textColor: CHARCOAL,
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: CHARCOAL,
      textColor: GOLD,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 50 },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 90 },
    },
    margin: { left: margin, right: margin },
  });

  // ── Totals block ───────────────────────────────────────────
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  const totalsX = pageWidth - margin - 200;

  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, finalY);
  doc.setTextColor(...CHARCOAL);
  doc.text(fmtMoney(input.subtotal), pageWidth - margin, finalY, { align: "right" });

  doc.setTextColor(...MUTED);
  doc.text("Tax", totalsX, finalY + 18);
  doc.setTextColor(...CHARCOAL);
  doc.text(fmtMoney(input.tax), pageWidth - margin, finalY + 18, { align: "right" });

  // Total — highlighted
  doc.setFillColor(...LIGHT);
  doc.rect(totalsX - 10, finalY + 30, 210, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...CHARCOAL);
  doc.text("TOTAL", totalsX, finalY + 48);
  doc.setTextColor(...GOLD);
  doc.setFontSize(14);
  doc.text(fmtMoney(input.total), pageWidth - margin, finalY + 48, { align: "right" });

  // ── Status + notes ────────────────────────────────────────
  let bottomY = finalY + 90;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("STATUS", margin, bottomY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const statusColor: [number, number, number] = input.status === "PAID" ? [16, 185, 129] : GOLD;
  doc.setTextColor(...statusColor);
  doc.text(input.status.toUpperCase(), margin, bottomY + 14);

  if (input.notes) {
    bottomY += 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("NOTES", margin, bottomY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...CHARCOAL);
    const wrapped = doc.splitTextToSize(input.notes, pageWidth - margin * 2);
    doc.text(wrapped, margin, bottomY + 14);
  }

  // ── Footer ─────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Generated on ${fmtDate(new Date())}`, margin, footerY);
  doc.text(
    `Thank you for your business — ${input.brand.name}`,
    pageWidth - margin,
    footerY,
    { align: "right" }
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
