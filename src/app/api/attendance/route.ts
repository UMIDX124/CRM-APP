import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isManager } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    // Either a single `?date=YYYY-MM-DD` OR a `?startDate=...&endDate=...`
    // range. Range mode is bounded to 93 days (a quarter + slack) to
    // prevent unbounded scans — the UI's monthly/range views never
    // need more than that.
    const date = url.searchParams.get("date");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const brand = url.searchParams.get("brand");

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const spanMs = end.getTime() - start.getTime();
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        spanMs < 0 ||
        spanMs > 93 * 24 * 60 * 60 * 1000
      ) {
        return NextResponse.json(
          { error: "Invalid or out-of-range date window" },
          { status: 400 }
        );
      }
      where.date = { gte: start, lte: end };
    } else {
      where.date = new Date(date || new Date().toISOString().split("T")[0]);
    }
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
