import { prisma } from "./db";

export const ANNUAL_ALLOWANCE: Record<"ANNUAL" | "SICK" | "CASUAL", number> = {
  ANNUAL: 20,
  SICK: 10,
  CASUAL: 5,
};

export interface LeaveBalanceEntry {
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveBalanceSummary {
  year: number;
  ANNUAL: LeaveBalanceEntry;
  SICK: LeaveBalanceEntry;
  CASUAL: LeaveBalanceEntry;
  UNPAID: { used: number };
}

/**
 * Compute a leave balance for a single employee in the given year.
 * Used days include APPROVED leaves only (PENDING still counts against
 * the quota when validating new requests — handled by caller).
 *
 * UNPAID leaves are tracked for reporting but have no allowance.
 */
export async function calculateLeaveBalance(
  employeeId: string,
  year: number
): Promise<LeaveBalanceSummary> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const rows = await prisma.leave.findMany({
    where: {
      employeeId,
      startDate: { gte: start, lt: end },
      status: { in: ["APPROVED", "PENDING"] },
    },
    select: { type: true, days: true, status: true },
  });

  const used = { ANNUAL: 0, SICK: 0, CASUAL: 0, UNPAID: 0 };
  for (const row of rows) {
    // Approved and pending both reduce available balance so an employee
    // can't submit duplicate requests against the same remaining budget.
    used[row.type] += row.days;
  }

  return {
    year,
    ANNUAL: {
      allocated: ANNUAL_ALLOWANCE.ANNUAL,
      used: used.ANNUAL,
      remaining: Math.max(0, ANNUAL_ALLOWANCE.ANNUAL - used.ANNUAL),
    },
    SICK: {
      allocated: ANNUAL_ALLOWANCE.SICK,
      used: used.SICK,
      remaining: Math.max(0, ANNUAL_ALLOWANCE.SICK - used.SICK),
    },
    CASUAL: {
      allocated: ANNUAL_ALLOWANCE.CASUAL,
      used: used.CASUAL,
      remaining: Math.max(0, ANNUAL_ALLOWANCE.CASUAL - used.CASUAL),
    },
    UNPAID: { used: used.UNPAID },
  };
}
