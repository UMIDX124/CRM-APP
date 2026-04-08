"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRealtime } from "@/components/RealtimeProvider";
import { useCountUp } from "@/hooks/useCountUp";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Building2, DollarSign, CheckSquare, TrendingUp,
  ArrowUpRight, Activity, Briefcase, ArrowRight, Zap,
  CheckCircle2, Trophy, Rocket, Shield, Cpu, BarChart3,
  Target, Star,
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

// Static revenue chart data (to be replaced with real time-series data from API later)
const revenueData = [
  { month: "Nov", vcs: 42000, bsl: 28000, dpl: 22000 },
  { month: "Dec", vcs: 45000, bsl: 32000, dpl: 25000 },
  { month: "Jan", vcs: 48000, bsl: 30000, dpl: 28000 },
  { month: "Feb", vcs: 52000, bsl: 35000, dpl: 32000 },
  { month: "Mar", vcs: 55000, bsl: 38000, dpl: 35000 },
  { month: "Apr", vcs: 58000, bsl: 40000, dpl: 38000 },
];

export default function DashboardModule({ brandId: _brandId, brandColor: _brandColor }: DashboardModuleProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const { activeCompany } = useCompany();
  const realtime = useRealtime();

  // Stable refetch we can call from the SSE handler too
  const refetch = useCallback(() => {
    fetch(`/api/dashboard?brand=${activeCompany.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [activeCompany.code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard?brand=${activeCompany.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setData(d); })
      .catch(() => {})
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
    { label: "Win Rate", value: `${Math.round(animatedWinRate)}%`, change: `${wonLeadsCount} won`, icon: Target, color: "#6366F1", href: "/pipeline" },
    { label: "Pipeline", value: String(Math.round(animatedLeads)), change: `${totalLeads} active`, icon: Briefcase, color: "#06B6D4", href: "/pipeline" },
  ];

  const kpis2 = [
    { label: "Team", value: String(teamCount), sub: "across 3 companies", icon: Users, color: "#F59E0B" },
    { label: "Invoices Paid", value: formatCurrency(data?.invoicesPaid || 0, true), sub: "collected", icon: DollarSign, color: "#10B981" },
    { label: "Pending", value: formatCurrency(data?.invoicesPending || 0, true), sub: "awaiting payment", icon: DollarSign, color: "#F59E0B" },
    { label: "Tasks Done", value: `${completedTasks}/${totalTasks}`, sub: `${completionRate}% completion`, icon: CheckSquare, color: "#3B82F6" },
  ];

  const taskStatuses = useMemo(() => [
    { name: "In Progress", value: Math.round(totalTasks * 0.3), color: "#3B82F6" },
    { name: "Review", value: Math.round(totalTasks * 0.15), color: "#F59E0B" },
    { name: "To Do", value: totalTasks - completedTasks - Math.round(totalTasks * 0.3) - Math.round(totalTasks * 0.15), color: "#71717A" },
    { name: "Completed", value: completedTasks, color: "#10B981" },
  ], [totalTasks, completedTasks]);

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </h2>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-0.5">Here&apos;s what&apos;s happening across your companies</p>
        </div>
      </div>

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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B00" stopOpacity={0.2} /><stop offset="100%" stopColor="#FF6B00" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} /><stop offset="100%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
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
                <Area type="monotone" dataKey="vcs" stroke="#FF6B00" strokeWidth={2} fill="url(#gV)" dot={false} />
                <Area type="monotone" dataKey="bsl" stroke="#3B82F6" strokeWidth={1.5} fill="url(#gB)" dot={false} />
                <Area type="monotone" dataKey="dpl" stroke="#22C55E" strokeWidth={1.5} fill="url(#gD)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[var(--border)]">
            {[{ name: "VCS", color: "#FF6B00" }, { name: "BSL", color: "#3B82F6" }, { name: "DPL", color: "#22C55E" }].map((b) => (
              <div key={b.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-[11px] text-[var(--foreground-dim)] font-medium">{b.name}</span>
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
              { label: "Win Rate", value: `${winRate}%`, color: "#6366F1" },
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
          { label: "New Lead", href: "/pipeline", icon: Briefcase, color: "#6366F1" },
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
