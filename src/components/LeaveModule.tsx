"use client";

import { CalendarOff } from "lucide-react";

/**
 * LeaveModule — placeholder for an upcoming feature.
 *
 * Previously this component rendered a static array of six fabricated
 * leave requests against mock employees. That was indistinguishable
 * from a working feature and misled managers trying to approve real
 * requests. There is no Leave model in the Prisma schema yet, so until
 * the backend lands we ship a clean empty state instead.
 */
export default function LeaveModule() {
  return (
    <div className="page-container">
      <div className="flex flex-col items-center justify-center min-h-[480px] text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-dim)] flex items-center justify-center mb-5">
          <CalendarOff className="w-7 h-7 text-[var(--primary)]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[var(--foreground)] tracking-tight mb-1.5">
          Leave Management
        </h2>
        <p className="text-[13px] text-[var(--foreground-dim)] max-w-md">
          Feature in development. Once wired up, this module will let
          employees submit leave requests and managers approve, reject,
          and track balances per leave type.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] text-[11px] font-medium text-[var(--foreground-dim)] bg-[var(--background)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          In development
        </span>
      </div>
    </div>
  );
}
