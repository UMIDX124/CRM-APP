import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, tenantWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification, autoPostToChannel } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    // tenantWhere enforces role-based scoping (company for managers,
    // brand for employees, unrestricted for super admin) and replaces
    // the previous hand-rolled branch that only filtered non-managers.
    const where: Record<string, unknown> = { ...tenantWhere(user) };
    if (brand) {
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

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const client = await prisma.client.create({ data: body });

    await logAudit({
      action: "CREATE", entity: "Client", entityId: client.id, userId: user.id,
      changes: { client: { old: null, new: body } },
    });

    // Notify team + auto-post to #general
    createNotification({
      type: "CLIENT_ADDED",
      title: "New Client",
      message: `${body.companyName || "New client"} added by ${user.firstName}`,
      userId: "all",
      data: { clientId: client.id },
    });
    autoPostToChannel("general", `📋 **New Client** — ${body.companyName || "Unknown"} added by ${user.firstName} ${user.lastName}`, user.id, "SYSTEM", { clientId: client.id });

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

    return NextResponse.json(client, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
