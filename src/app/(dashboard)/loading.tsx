/**
 * Dashboard group loading skeleton.
 *
 * Shown during server navigation between any `(dashboard)/*` route while
 * Server Components are streaming. Matches the `KPICards` + content grid
 * rhythm of the home dashboard so the layout doesn't shift on arrival.
 */
export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-[var(--surface-2,rgba(255,255,255,0.04))]" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>

      <div className="h-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}
