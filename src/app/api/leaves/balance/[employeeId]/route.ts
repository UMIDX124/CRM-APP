import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isManager } from "@/lib/auth";
import { calculateLeaveBalance } from "@/lib/leaves";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { employeeId } = await params;

    // Employees can only query their own balance unless they're managers
    if (employeeId !== user.id && !isManager(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const balance = await calculateLeaveBalance(employeeId, year);
    return NextResponse.json(balance);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[leaves.balance.GET] error:", msg);
    return NextResponse.json(
      { error: msg === "Unauthorized" ? "Unauthorized" : "Failed to load balance" },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
