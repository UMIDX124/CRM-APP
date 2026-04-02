"use client";

import { clsx } from "clsx";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx("p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3", className)}>
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-3 w-full rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-4 flex-1 rounded" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-white/[0.04]">
          <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <div key={j} className="skeleton h-4 w-16 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-3 w-48 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
