"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";
import { useCompany, companies } from "./CompanyContext";

export default function CompanySwitcher() {
  const { activeCompany, setActiveCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resolvedAccent = activeCompany.accent || "#F59E0B";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all cursor-pointer group"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: resolvedAccent, boxShadow: `0 0 6px ${resolvedAccent}50` }}
        />
        <span className="text-[12px] text-[var(--foreground-muted)] font-medium hidden sm:inline">{activeCompany.name}</span>
        <span className="text-[12px] text-[var(--foreground-muted)] font-medium sm:hidden">{activeCompany.code}</span>
        <ChevronDown className={clsx(
          "w-3 h-3 text-[var(--foreground-dim)] transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-lg shadow-xl shadow-black/30 z-50 overflow-hidden animate-scale-in"
          role="listbox"
          aria-label="Select company"
        >
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-semibold text-[var(--foreground-dim)] uppercase tracking-widest">Switch Company</p>
          </div>
          {companies.map((company) => {
            const isActive = company.id === activeCompany.id;
            const color = company.accent || "#F59E0B";
            return (
              <button
                key={company.id}
                role="option"
                aria-selected={isActive}
                onClick={() => { setActiveCompany(company); setOpen(false); }}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface)]"
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {company.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-[13px] truncate", isActive ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground-muted)]")}>
                    {company.name}
                  </p>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                    <Check className="w-3 h-3" style={{ color }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
