import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere } from "@/lib/auth";

const createListSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#F59E0B"),
  icon: z.string().max(40).optional().nullable(),
  brandId: z.string().optional().nullable(),
  order: z.number().int().optional().default(0),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brandId = url.searchParams.get("brandId");

    const tenantFilter = tenantWhere(user);
    const where: Record<string, unknown> = brandId
      ? { brandId, ...tenantFilter }
      : tenantFilter;

    const lists = await prisma.taskList.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { tasks: true } },
        brand: { select: { id: true, code: true, color: true } },
      },
    });

    return NextResponse.json({ lists });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const raw = await req.json().catch(() => null);
    const parsed = createListSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const list = await prisma.taskList.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        color: parsed.data.color,
        icon: parsed.data.icon ?? null,
        brandId: parsed.data.brandId ?? user.brandId ?? null,
        order: parsed.data.order,
      },
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
