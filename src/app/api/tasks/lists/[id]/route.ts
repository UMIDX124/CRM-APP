import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const updateListSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(40).nullable().optional(),
  order: z.number().int().optional(),
});

async function ensureOwnership(listId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { brandId: true, brand: { select: { companyId: true } } },
  });
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    select: { id: true, brandId: true, brand: { select: { companyId: true } } },
  });
  if (!list) return null;
  if (!user) return null;
  // Same-company guard: list with no brand is treated as global within the company
  if (list.brand?.companyId && user.brand?.companyId && list.brand.companyId !== user.brand.companyId) {
    return null;
  }
  return list;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const owned = await ensureOwnership(id, user.id);
    if (!owned) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = updateListSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const list = await prisma.taskList.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ list });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const owned = await ensureOwnership(id, user.id);
    if (!owned) return NextResponse.json({ error: "List not found" }, { status: 404 });

    // Tasks in the list have listId set to null via onDelete: SetNull
    await prisma.taskList.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

