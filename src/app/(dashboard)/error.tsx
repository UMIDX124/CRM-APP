"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Dashboard group error boundary.
 *
 * Catches any uncaught exception inside `(dashboard)/*` routes and shows a
 * retry button. The `reset` prop re-mounts the nearest segment so users
 * can recover without a full page reload.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-[18px] font-semibold text-[var(--foreground)] mb-1">
        Something went wrong
      </h2>
      <p className="text-[13px] text-[var(--foreground-dim)] max-w-md mb-5">
        This section hit an unexpected error. Try again, or go back to the
        dashboard if it keeps happening.
      </p>
      {error.digest && (
        <p className="text-[10px] text-[var(--foreground-dim)] mb-4 font-mono opacity-60">
          ref: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-[13px] font-medium hover:bg-[var(--surface)] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
