"use client";

import { useEffect } from "react";

/**
 * Root error boundary — catches errors that bubble past all nested
 * `error.tsx` files (e.g. failures in the root layout's children).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0f)] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-[20px] font-semibold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-[13px] text-white/60 mb-5">
          The application hit an unexpected error. Please try again.
        </p>
        {error.digest && (
          <p className="text-[10px] text-white/40 mb-4 font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
