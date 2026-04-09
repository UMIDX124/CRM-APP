"use client";

import { DollarSign } from "lucide-react";

/**
 * PayrollModule — placeholder for an upcoming feature.
 *
 * This module previously shipped fake payroll rows generated from
 * mock-data salaries + Math.random() status buckets. That gave the
 * illusion of a working feature and caused users to treat the numbers
 * as real. The underlying schema (Payroll, Payslip, etc.) does not
 * exist yet, so instead of shipping fiction we render a clean
 * "feature in development" empty state until the backend lands.
 */
export default function PayrollModule() {
  return (
    <div className="page-container">
      <div className="flex flex-col items-center justify-center min-h-[480px] text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-dim)] flex items-center justify-center mb-5">
          <DollarSign className="w-7 h-7 text-[var(--primary)]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[var(--foreground)] tracking-tight mb-1.5">
          Payroll
        </h2>
        <p className="text-[13px] text-[var(--foreground-dim)] max-w-md">
          Feature in development. Once the payroll backend is wired up,
          this module will show salaries, bonuses, deductions, and payslip
          exports for every active employee.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] text-[11px] font-medium text-[var(--foreground-dim)] bg-[var(--background)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          In development
        </span>
      </div>
    </div>
  );
}
