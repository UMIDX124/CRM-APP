"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DealsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Deals route error:", error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <h2 className="text-[17px] font-semibold text-[var(--foreground)] mb-1">
        Couldn&rsquo;t load the deals pipeline
      </h2>
      <p className="text-[12px] text-[var(--foreground-dim)] max-w-md mb-4">
        Something went wrong loading deals. Try again — your data is safe.
      </p>
      {error.digest && (
        <p className="text-[10px] text-[var(--foreground-dim)] mb-3 font-mono opacity-60">
          ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-medium hover:opacity-90"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Try again
      </button>
    </div>
  );
}
