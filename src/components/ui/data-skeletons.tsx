"use client";

/** Layout-matched skeleton states for data components */

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-glow overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 skeleton rounded" style={{ width: `${60 + (i * 13) % 50}px` }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <div key={c} className="h-3 skeleton rounded" style={{ width: `${50 + ((r + c) * 17) % 80}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="kanban-column p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-20 skeleton rounded" />
            <div className="h-5 w-5 skeleton rounded" />
          </div>
          {Array.from({ length: 2 + (col % 2) }).map((_, card) => (
            <div key={card} className="kanban-card space-y-2.5">
              <div className="h-4 w-3/4 skeleton rounded" />
              <div className="h-3 w-1/2 skeleton rounded" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 skeleton rounded-full" />
                <div className="h-2.5 w-16 skeleton rounded" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-5 w-14 skeleton rounded-full" />
                <div className="h-3 w-12 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 skeleton rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 skeleton rounded" />
              <div className="h-3 w-1/2 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full skeleton rounded" />
            <div className="h-3 w-2/3 skeleton rounded" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="h-5 w-16 skeleton rounded-full" />
            <div className="h-3 w-12 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="card-glow p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1.5">
          <div className="h-4 w-24 skeleton rounded" />
          <div className="h-3 w-40 skeleton rounded" />
        </div>
        <div className="h-8 w-32 skeleton rounded-lg" />
      </div>
      <div className="skeleton rounded-xl" style={{ height }} />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1.5">
        <div className="h-5 w-32 skeleton rounded" />
        <div className="h-3 w-48 skeleton rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-28 skeleton rounded-lg" />
        <div className="h-9 w-9 skeleton rounded-lg" />
      </div>
    </div>
  );
}
