import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

// Strict invoice create schema. Rejects malformed line items (e.g.
// missing description, non-positive quantity, negative rate) that the
// previous unvalidated `...body` spread accepted silently. Subtotal
// and total can be client-provided for audit-trail symmetry, but must
// be non-negative numbers. Notes are optional and bounded.
const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().finite(),
  rate: z.number().nonnegative().finite(),
});

const invoiceCreateSchema = z.object({
  clientId: z.string().min(1),
  brandId: z.string().min(1),
  items: z.array(invoiceItemSchema).min(1).max(100),
  subtotal: z.number().nonnegative().finite(),
  tax: z.number().nonnegative().finite().optional().default(0),
  total: z.number().nonnegative().finite(),
  status: z
    .enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"])
    .optional()
    .default("PENDING"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().max(4000).optional().nullable(),
});

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

    // 20 invoice creations per minute per user. Invoice rows trigger
    // webhook fan-out downstream, so uncontrolled creation is expensive.
    const rl = await rateLimit("invoices-create", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = invoiceCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "INVOICE_VALIDATION",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const count = await prisma.invoice.count();
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: body.clientId,
        brandId: body.brandId,
        items: body.items,
        subtotal: body.subtotal,
        tax: body.tax,
        total: body.total,
        status: body.status,
        issueDate: new Date(body.issueDate),
        dueDate: new Date(body.dueDate),
        notes: body.notes ?? null,
      },
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
