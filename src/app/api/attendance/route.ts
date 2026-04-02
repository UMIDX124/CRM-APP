import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const brand = url.searchParams.get("brand");

    const where: Record<string, unknown> = {
      date: new Date(date),
    };
    if (brand) where.user = { brand: { code: brand } };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, title: true,
            department: true, brand: { select: { code: true, color: true } },
          },
        },
      },
      orderBy: { checkIn: "asc" },
    });

    return NextResponse.json(records);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { userId, date, status, checkIn, checkOut, hoursWorked, notes } = body;

    const targetUserId = userId || user.id;
    if (targetUserId !== user.id && !isManager(user.role)) {
      return NextResponse.json({ error: "Cannot mark attendance for others" }, { status: 403 });
    }

    const record = await prisma.attendance.upsert({
      where: { userId_date: { userId: targetUserId, date: new Date(date) } },
      update: { status, checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, hoursWorked, notes },
      create: { userId: targetUserId, date: new Date(date), status, checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null, hoursWorked: hoursWorked || 0, notes },
    });

    return NextResponse.json(record);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
