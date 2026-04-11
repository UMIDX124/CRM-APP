import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// Vercel Cron: runs daily at 10:00 AM PKT (05:00 UTC)
// Marks PENDING invoices past due date as OVERDUE and notifies managers

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all PENDING invoices that are past due
    const overdue = await prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: now },
      },
      include: {
        client: { select: { companyName: true, contactName: true } },
      },
    });

    if (overdue.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    // Update status to OVERDUE
    await prisma.invoice.updateMany({
      where: {
        id: { in: overdue.map((i) => i.id) },
        status: "PENDING",
      },
      data: { status: "OVERDUE" },
    });

    // Notify managers about each overdue invoice
    for (const inv of overdue) {
      await createNotification({
        type: "INVOICE_OVERDUE",
        title: "Invoice Overdue",
        message: `${inv.number} — $${inv.total.toLocaleString()} from ${inv.client.companyName} is now overdue`,
        userId: "all",
        data: { invoiceId: inv.id, invoiceNumber: inv.number, amount: inv.total },
      });
    }

    return NextResponse.json({ ok: true, updated: overdue.length });
  } catch (err) {
    console.error("[cron/overdue-invoices]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
