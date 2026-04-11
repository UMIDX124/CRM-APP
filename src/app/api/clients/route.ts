import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    // tenantWhere enforces role-based scoping. For employees (already locked
    // to their own brandId) we IGNORE ?brand to avoid the "Clients page shows 0"
    // bug where a company-switcher set to a brand the employee doesn't own
    // would intersect with tenantWhere and return an empty list. Super admin
    // and company managers can still narrow by brand code.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    const canFilterByBrand = user.role === "SUPER_ADMIN" || isManager(user.role);
    if (brand && canFilterByBrand) {
      const existing = (where.brand as Record<string, unknown> | undefined) ?? {};
      where.brand = { ...existing, code: brand };
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        brand: { select: { code: true, name: true, color: true } },
        // Expose a live active-task count so the UI can stop hardcoding
        // it to 0. "Active" = not in COMPLETED or BLOCKED state.
        _count: {
          select: {
            tasks: {
              where: { status: { notIn: ["COMPLETED", "BLOCKED"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(clients);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

// Validation schema for POST body. Accepts either brandId (real cuid) or
// brandCode ("VCS"/"BSL"/"DPL"). The client previously sent a hardcoded
// "1"/"2"/"3" as brandId which triggered a Prisma FK error and silently
// failed in the UI — root cause of the "Add Client form resets" bug.
const createClientSchema = z
  .object({
    companyName: z.string().trim().min(1, "Company name is required").max(200),
    contactName: z.string().trim().min(1, "Contact name is required").max(200),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().max(50).optional().nullable(),
    country: z.string().trim().max(100).optional().nullable(),
    brandId: z.string().min(1).optional(),
    brandCode: z.string().min(1).max(10).optional(),
    mrr: z.number().finite().min(0).optional(),
    healthScore: z.number().int().min(0).max(100).optional(),
    source: z.string().trim().max(100).optional().nullable(),
    services: z.array(z.string().trim().max(100)).optional(),
    website: z.string().trim().max(300).optional().nullable(),
    lastContactDate: z.string().optional().nullable(),
    nextFollowUp: z.string().optional().nullable(),
  })
  .refine((v) => Boolean(v.brandId || v.brandCode), {
    message: "brandId or brandCode is required",
    path: ["brandId"],
  });

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createClientSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message || "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Resolve brandId from brandCode when needed
    let brandId = input.brandId;
    if (!brandId && input.brandCode) {
      const brand = await prisma.brand.findUnique({
        where: { code: input.brandCode },
        select: { id: true },
      });
      if (!brand) {
        return NextResponse.json(
          { error: `Unknown brand code "${input.brandCode}"` },
          { status: 400 }
        );
      }
      brandId = brand.id;
    }
    if (!brandId) {
      return NextResponse.json({ error: "brandId could not be resolved" }, { status: 400 });
    }

    // Verify the target brand is visible to the requesting user
    const tenantScope = tenantWhere(user);
    const visibleBrand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        ...((tenantScope as { brand?: Record<string, unknown> }).brand ?? {}),
        ...((tenantScope as { brandId?: string }).brandId
          ? { id: (tenantScope as { brandId: string }).brandId }
          : {}),
      },
      select: { id: true },
    });
    if (user.role !== "SUPER_ADMIN" && !visibleBrand) {
      return NextResponse.json(
        { error: "You don't have access to the selected brand" },
        { status: 403 }
      );
    }

    const data = {
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      country: input.country ?? null,
      brandId,
      mrr: input.mrr ?? 0,
      healthScore: input.healthScore ?? 80,
      source: input.source ?? null,
      services: input.services ?? [],
      website: input.website ?? null,
      lastContactDate: input.lastContactDate ? new Date(input.lastContactDate) : null,
      nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : null,
    };

    const client = await prisma.client.create({
      data,
      include: {
        brand: { select: { code: true, name: true, color: true } },
        _count: {
          select: {
            tasks: { where: { status: { notIn: ["COMPLETED", "BLOCKED"] } } },
          },
        },
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      userId: user.id,
      changes: { client: { old: null, new: data } },
    });

    // Notify team + auto-post to #general (fire-and-forget; never block response)
    try {
      createNotification({
        type: "CLIENT_ADDED",
        title: "New Client",
        message: `${client.companyName} added by ${user.firstName}`,
        userId: "all",
        data: { clientId: client.id },
      });
      autoPostToChannel(
        "general",
        `📋 **New Client** — ${client.companyName} added by ${user.firstName} ${user.lastName}`,
        user.id,
        "SYSTEM",
        { clientId: client.id }
      );
    } catch (notifyErr) {
      console.error("[clients.POST] notify error (non-fatal):", notifyErr);
    }

    try {
      await dispatchWebhook(
        "CLIENT_CREATED",
        {
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          status: client.status,
          mrr: client.mrr,
        },
        { brandId: client.brandId }
      );
    } catch (hookErr) {
      console.error("[clients.POST] webhook error (non-fatal):", hookErr);
    }

    return NextResponse.json(client, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[clients.POST] error:", msg);
    // Never expose raw Prisma errors
    const safe =
      msg === "Unauthorized"
        ? "Unauthorized"
        : msg.includes("Unique constraint")
          ? "A client with this email already exists"
          : "Failed to create client";
    return NextResponse.json({ error: safe }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
