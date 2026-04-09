import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantWhere } from "@/lib/auth";
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
    const user = await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const brand = url.searchParams.get("brand");

    // Tenant scope: managers see all brands in their company; employees see
    // only their own brand. Caller-provided filters can only narrow.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (status) where.status = status;
    if (brand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }

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

    // Verify caller actually owns the target brand/client — otherwise
    // a DPL manager could create an invoice on a VCS client by guessing
    // the id. Without this check the new Zod schema just validates
    // format, not ownership.
    const brandOk = await prisma.brand.findFirst({
      where: { id: body.brandId, ...(user.role === "SUPER_ADMIN" ? {} : user.role === "PROJECT_MANAGER" || user.role === "DEPT_HEAD" ? { companyId: user.companyId ?? "__none__" } : { id: user.brandId ?? "__none__" }) },
      select: { id: true },
    });
    if (!brandOk) {
      return NextResponse.json({ error: "Invalid brand for your tenant" }, { status: 403 });
    }
    const clientOk = await prisma.client.findFirst({
      where: { id: body.clientId, ...tenantWhere(user) },
      select: { id: true },
    });
    if (!clientOk) {
      return NextResponse.json({ error: "Invalid client for your tenant" }, { status: 403 });
    }

    // Server-side recompute so the client can't inflate `subtotal` /
    // `total`. We trust the line items (already Zod-validated) and
    // derive the money values from them. If the caller submitted
    // mismatched figures we log it and use the recomputed values.
    const computedSubtotal = body.items.reduce(
      (s, item) => s + item.quantity * item.rate,
      0
    );
    const computedTotal = computedSubtotal + (body.tax ?? 0);
    const roundedSubtotal = Math.round(computedSubtotal * 100) / 100;
    const roundedTotal = Math.round(computedTotal * 100) / 100;
    const subtotalDelta = Math.abs(body.subtotal - roundedSubtotal);
    const totalDelta = Math.abs(body.total - roundedTotal);
    if (subtotalDelta > 0.02 || totalDelta > 0.02) {
      console.warn(
        `[invoices] client-submitted totals mismatch — recomputing. ` +
          `client: subtotal=${body.subtotal}, total=${body.total}. ` +
          `server: subtotal=${roundedSubtotal}, total=${roundedTotal}`
      );
    }

    const count = await prisma.invoice.count();
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: body.clientId,
        brandId: body.brandId,
        items: body.items,
        subtotal: roundedSubtotal,
        tax: body.tax,
        total: roundedTotal,
        status: body.status,
        issueDate: new Date(body.issueDate),
        dueDate: new Date(body.dueDate),
        notes: body.notes ?? null,
      },
    });

    await logAudit({
      action: "CREATE", entity: "Invoice", entityId: invoice.id, userId: user.id,
      changes: { invoice: { old: null, new: { number, total: roundedTotal, clientId: body.clientId } } },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
