"use client";

import { Receipt } from "lucide-react";

/**
 * ExpenseModule — placeholder for an upcoming feature.
 *
 * This component used to fabricate expense rows from mock employees.
 * There is no Expense model in the Prisma schema yet, so we render a
 * clean "feature in development" empty state instead of shipping fake
 * receipts and approval statuses.
 */
export default function ExpenseModule() {
  return (
    <div className="page-container">
      <div className="flex flex-col items-center justify-center min-h-[480px] text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-dim)] flex items-center justify-center mb-5">
          <Receipt className="w-7 h-7 text-[var(--primary)]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[var(--foreground)] tracking-tight mb-1.5">
          Expenses
        </h2>
        <p className="text-[13px] text-[var(--foreground-dim)] max-w-md">
          Feature in development. Once the expense backend is wired up,
          employees will be able to submit receipts and managers will
          review, categorize, and reimburse them from this module.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] text-[11px] font-medium text-[var(--foreground-dim)] bg-[var(--background)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          In development
        </span>
      </div>
    </div>
  );
}
