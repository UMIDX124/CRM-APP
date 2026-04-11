"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRealtime } from "@/components/RealtimeProvider";
import { useCountUp } from "@/hooks/useCountUp";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Building2, DollarSign, CheckSquare,
  ArrowUpRight, Briefcase, ArrowRight,
  Target,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/types";
import { useCompany } from "@/components/CompanyContext";

// P0-4 FIX: No more mock-data import. Dashboard fetches real data from /api/dashboard

interface DashboardData {
  clients: number;
  employees: number;
  tasks: number;
  completedTasks: number;
  todoTasks?: number;
  inProgressTasks?: number;
  reviewTasks?: number;
  blockedTasks?: number;
  leads: number;
  wonLeads: number;
  revenue: number;
  invoicesPaid: number;
  invoicesPending: number;
  invoicesOverdue: number;
}

interface DashboardModuleProps {
  brandId: string;
  brandColor: string;
}

// Revenue chart shape returned by /api/dashboard/revenue. Each row has a
// `month` label ("Nov 2025") plus one numeric key per brand code
// (`vcs`, `bsl`, `dpl`, …) summed from PAID invoices in that month.
interface RevenueRow {
  month: string;
  [brand: string]: string | number;
}
interface RevenueResponse {
  months: RevenueRow[];
  brands: string[];
}

// Brand colors used for the stacked areas. Unknown brand codes fall back
// to a neutral gold so the chart still renders.
const BRAND_COLORS: Record<string, string> = {
  vcs: "#FF6B00",
  bsl: "#3B82F6",
  dpl: "#22C55E",
  fallback: "#F59E0B",
};

export default function DashboardModule({ brandId: _brandId, brandColor: _brandColor }: DashboardModuleProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  // Surface API failures so a down database shows an explicit retry
  // banner instead of stale data + silent .catch(() => {}).
  const [loadError, setLoadError] = useState<string | null>(null);
  // `greeting` is time-of-day dependent, which would mismatch between SSR
  // (server clock) and hydration (client clock) and trigger React error
  // #418. We render a neutral "Good day" on first paint and flip to the
  // real greeting inside an effect once the component has mounted.
  const [greeting, setGreeting] = useState<string>("Good day");
  const { activeCompany } = useCompany();
  const realtime = useRealtime();

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    );
  }, []);

  // Stable refetch we can call from the SSE handler too. Both the KPI
  // summary and the revenue chart refresh together so a new paid invoice
  // shows up in both places on the same tick.
  const refetch = useCallback(() => {
    setLoadError(null);
    Promise.all([
      fetch(`/api/dashboard?brand=${activeCompany.code}`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`dashboard ${r.status}`);
        return r.json();
      }),
      fetch(`/api/dashboard/revenue?months=6`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`revenue ${r.status}`);
        return r.json();
      }),
    ])
      .then(([summary, rev]) => {
        if (summary) setData(summary);
        if (rev) setRevenue(rev);
      })
      .catch((err) => {
        console.error("[dashboard] refetch failed:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to refresh dashboard");
      });
  }, [activeCompany.code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      fetch(`/api/dashboard?brand=${activeCompany.code}`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`dashboard ${r.status}`);
        return r.json();
      }),
      fetch(`/api/dashboard/revenue?months=6`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`revenue ${r.status}`);
        return r.json();
      }),
    ])
      .then(([summary, rev]) => {
        if (cancelled) return;
        if (summary) setData(summary);
        if (rev) setRevenue(rev);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[dashboard] initial load failed:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompany.code]);

  // Live refresh on any new chat message — cheap signal that something
  // probably changed. Debounced to 1s so a burst of 5 messages doesn't fire
  // 5 dashboard fetches.
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsub = realtime.subscribeMessage(() => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        refetch();
      }, 1000);
    });
    return () => {
      unsub();
      if (pending) clearTimeout(pending);
    };
  }, [realtime, refetch]);

  const clientCount = data?.clients || 0;
  const teamCount = data?.employees || 0;
  const totalTasks = data?.tasks || 0;
  const completedTasks = data?.completedTasks || 0;
  const totalRevenue = data?.revenue || 0;
  const wonLeadsCount = data?.wonLeads || 0;
  const totalLeads = data?.leads || 0;
  const winRate = totalLeads > 0 ? Math.round((wonLeadsCount / totalLeads) * 100) : 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Animated numbers — re-tween whenever the underlying value changes (incl. SSE refetch)
  const animatedRevenue = useCountUp(totalRevenue);
  const animatedClients = useCountUp(clientCount);
  const animatedWinRate = useCountUp(winRate);
  const animatedLeads = useCountUp(totalLeads);

  const kpis = [
    { label: "Revenue", value: formatCurrency(Math.round(animatedRevenue), true), change: "+12%", icon: DollarSign, color: "#10B981", href: "/invoices" },
    { label: "Clients", value: String(Math.round(animatedClients)), change: "+3 new", icon: Building2, color: "#3B82F6", href: "/clients" },
    { label: "Win Rate", value: `${Math.round(animatedWinRate)}%`, change: `${wonLeadsCount} won`, icon: Target, color: "#F59E0B", href: "/pipeline" },
    { label: "Pipeline", value: String(Math.round(animatedLeads)), change: `${totalLeads} active`, icon: Briefcase, color: "#06B6D4", href: "/pipeline" },
  ];

  const kpis2 = [
    { label: "Team", value: String(teamCount), sub: "across 3 companies", icon: Users, color: "#F59E0B" },
    { label: "Invoices Paid", value: formatCurrency(data?.invoicesPaid || 0, true), sub: "collected", icon: DollarSign, color: "#10B981" },
    { label: "Pending", value: formatCurrency(data?.invoicesPending || 0, true), sub: "awaiting payment", icon: DollarSign, color: "#F59E0B" },
    { label: "Tasks Done", value: `${completedTasks}/${totalTasks}`, sub: `${completionRate}% completion`, icon: CheckSquare, color: "#3B82F6" },
  ];

  const todoTasks = Math.max(0, data?.todoTasks || 0);
  const inProgressTasks = Math.max(0, data?.inProgressTasks || 0);
  const reviewTasks = Math.max(0, data?.reviewTasks || 0);

  const taskStatuses = useMemo(() => [
    { name: "In Progress", value: inProgressTasks, color: "#3B82F6" },
    { name: "Review", value: reviewTasks, color: "#F59E0B" },
    { name: "To Do", value: todoTasks, color: "#71717A" },
    { name: "Completed", value: completedTasks, color: "#10B981" },
  ], [todoTasks, inProgressTasks, reviewTasks, completedTasks]);

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            {greeting}
          </h2>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-0.5">Here&apos;s what&apos;s happening across your companies</p>
        </div>
      </div>

      {/* Load failure banner — surfaces API errors instead of silently
          showing stale/null values. */}
      {loadError && !loading && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--danger)]">Dashboard failed to load</p>
            <p className="text-[12px] text-[var(--foreground-dim)] mt-0.5">{loadError}</p>
          </div>
          <button
            onClick={refetch}
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-[12px] font-medium hover:bg-[var(--border)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Link key={i} href={kpi.href} className="kpi-card card-interactive group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}12` }}>
                  <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/8 px-2 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3 h-3" />{kpi.change}
                </span>
              </div>
              <p className="text-[10px] font-medium text-[var(--foreground-dim)] mb-0.5 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-[22px] font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
                {loading ? <span className="skeleton inline-block h-7 w-20" /> : kpi.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis2.map((kpi, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kpi.color}10` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--foreground)] tabular-nums">
                {loading ? <span className="skeleton inline-block h-5 w-14" /> : kpi.value}
              </p>
              <p className="text-[10px] text-[var(--foreground-dim)] truncate">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card-glow p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Revenue</h3>
              <p className="text-[12px] text-[var(--foreground-dim)] mt-0.5">6 month performance by company</p>
            </div>
            <div className="tab-list">
              {["7d", "30d", "90d"].map((r) => (
                <button key={r} onClick={() => setTimeRange(r)} className={`tab-item ${timeRange === r ? "active" : ""}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="h-[240px]">
            {loading ? (
              <div className="h-full w-full skeleton rounded-xl" />
            ) : !revenue ||
              revenue.months.length === 0 ||
              revenue.months.every((m) =>
                revenue.brands.every((code) => !Number(m[code]))
              ) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-[var(--foreground-dim)]">
                <DollarSign className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-[13px] font-medium">No revenue data yet</p>
                <p className="text-[11px] mt-0.5">Revenue appears here once invoices are marked PAID</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.months} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    {revenue.brands.map((code) => {
                      const color = BRAND_COLORS[code] ?? BRAND_COLORS.fallback;
                      return (
                        <linearGradient key={code} id={`grev-${code}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--foreground-dim)", fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--foreground-dim)", fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const total = payload.reduce((s, e) => s + (e.value as number), 0);
                    return (
                      <div className="card-glass p-3 shadow-xl min-w-[160px] border border-[var(--border)]" style={{ borderRadius: 12 }}>
                        <p className="text-[11px] text-[var(--foreground-dim)] mb-2 font-medium">{label}</p>
                        {payload.map((e) => (
                          <div key={e.name} className="flex items-center justify-between gap-4 py-0.5">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[11px] text-[var(--foreground-muted)]">{String(e.name).toUpperCase()}</span></div>
                            <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">${(e.value as number).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between">
                          <span className="text-[10px] text-[var(--foreground-dim)]">Total</span>
                          <span className="text-[12px] font-bold text-[var(--primary)] tabular-nums">${total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }} />
                  {revenue.brands.map((code) => (
                    <Area
                      key={code}
                      type="monotone"
                      dataKey={code}
                      stroke={BRAND_COLORS[code] ?? BRAND_COLORS.fallback}
                      strokeWidth={2}
                      fill={`url(#grev-${code})`}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[var(--border)]">
            {(revenue?.brands ?? []).map((code) => (
              <div key={code} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[code] ?? BRAND_COLORS.fallback }} />
                <span className="text-[11px] text-[var(--foreground-dim)] font-medium">{code.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Tasks</h3>
            <Link href="/tasks" className="text-[11px] text-[var(--primary)] hover:text-[var(--primary-light)] flex items-center gap-1 transition-colors">View <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              <div className="skeleton h-[100px] rounded-xl" />
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-4 rounded" />)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <div className="relative w-[100px] h-[100px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={taskStatuses} cx="50%" cy="50%" innerRadius={32} outerRadius={46} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {taskStatuses.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[16px] font-bold text-[var(--foreground)] tabular-nums">{totalTasks}</span>
                    <span className="text-[8px] text-[var(--foreground-dim)] uppercase">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {taskStatuses.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[11px] text-[var(--foreground-dim)]">{s.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--foreground)] tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[var(--foreground-dim)]">Completion</span>
                  <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">{completionRate}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${completionRate}%`, background: `linear-gradient(90deg, #10B981, #34D399)` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Stats */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Overview</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[20px] font-semibold text-emerald-400 tabular-nums">{clientCount}</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">Clients</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[var(--foreground)] tabular-nums">{teamCount}</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">Team</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-blue-400 tabular-nums">{totalLeads}</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">Leads</p>
            </div>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Pipeline</h3>
            <Link href="/pipeline" className="text-[11px] text-[var(--primary)] hover:text-[var(--primary-light)] flex items-center gap-1 transition-colors">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total Leads", value: String(totalLeads), color: "#3B82F6" },
              { label: "Won Deals", value: String(wonLeadsCount), color: "#10B981" },
              { label: "Win Rate", value: `${winRate}%`, color: "#F59E0B" },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[12px] text-[var(--foreground-dim)]">{m.label}</span>
                </div>
                <span className="text-[13px] font-semibold text-[var(--foreground)] tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Financials</h3>
          <div className="space-y-3">
            {[
              { label: "Total MRR", value: formatCurrency(totalRevenue, true), color: "#10B981" },
              { label: "Paid Invoices", value: formatCurrency(data?.invoicesPaid || 0, true), color: "#3B82F6" },
              { label: "Pending", value: formatCurrency(data?.invoicesPending || 0, true), color: "#F59E0B" },
              { label: "Overdue", value: formatCurrency(data?.invoicesOverdue || 0, true), color: "#EF4444" },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[12px] text-[var(--foreground-dim)]">{m.label}</span>
                </div>
                <span className="text-[13px] font-semibold text-[var(--foreground)] tabular-nums">
                  {loading ? <span className="skeleton inline-block h-4 w-16" /> : m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Add Client", href: "/clients", icon: Building2, color: "#3B82F6" },
          { label: "Create Task", href: "/tasks", icon: CheckSquare, color: "#10B981" },
          { label: "New Lead", href: "/pipeline", icon: Briefcase, color: "#F59E0B" },
          { label: "Send Invoice", href: "/invoices", icon: DollarSign, color: "#F59E0B" },
        ].map((link) => (
          <Link key={link.label} href={link.href} className="card p-4 flex items-center gap-3 hover:border-[var(--border-hover)] transition-all group cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${link.color}10` }}>
              <link.icon className="w-4 h-4" style={{ color: link.color }} />
            </div>
            <span className="text-[13px] text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors">{link.label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--foreground-dim)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
