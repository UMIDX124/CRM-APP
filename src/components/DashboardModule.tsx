"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  Users, Building2, DollarSign, CheckSquare, TrendingUp,
  ArrowUpRight, Activity, Briefcase, ArrowRight, Zap,
  CheckCircle2, Trophy, Rocket, Shield, Cpu, BarChart3,
  Target, Percent, Calendar, Star,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/types";
import { clients, employees, tasks, leads, revenueData, activities, serviceTypes } from "@/data/mock-data";

interface DashboardModuleProps {
  brandId: string;
  brandColor: string;
}

export default function DashboardModule({ brandId, brandColor }: DashboardModuleProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<{ clients: number; employees: number; tasks: number; revenue: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setApiData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [brandId]);

  const totalRevenue = clients.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const activeClientCount = apiData?.clients || clients.length;
  const teamCount = apiData?.employees || employees.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "REVIEW").length;
  const totalTasks = tasks.length;
  const openLeads = leads.filter((l) => l.status !== "WON" && l.status !== "LOST").length;
  const pipelineValue = leads.filter((l) => l.status !== "LOST").reduce((s, l) => s + l.value, 0);
  const wonLeads = leads.filter((l) => l.status === "WON");
  const lostLeads = leads.filter((l) => l.status === "LOST");
  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const avgDealSize = wonLeads.length > 0 ? Math.round(wonLeads.reduce((s, l) => s + l.value, 0) / wonLeads.length) : 0;
  const avgHealth = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length) : 0;

  // Conversion funnel data
  const funnelData = useMemo(() => [
    { stage: "New", count: leads.filter((l) => l.status === "NEW").length, color: "#3B82F6" },
    { stage: "Qualified", count: leads.filter((l) => l.status === "QUALIFIED").length, color: "#06B6D4" },
    { stage: "Proposal", count: leads.filter((l) => l.status === "PROPOSAL_SENT").length, color: "#F59E0B" },
    { stage: "Negotiation", count: leads.filter((l) => l.status === "NEGOTIATION").length, color: "#FF6B00" },
    { stage: "Won", count: wonLeads.length, color: "#10B981" },
  ], [wonLeads.length]);

  // Lead sources
  const leadSources = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.source.split(" - ")[0] || "Other";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    return Object.entries(sourceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, []);

  const kpis = [
    { label: "Revenue", value: formatCurrency(apiData?.revenue || totalRevenue, true), change: "+12.5%", icon: DollarSign, color: "#10B981", href: "/invoices" },
    { label: "Clients", value: String(activeClientCount), change: "+3 new", icon: Building2, color: "#3B82F6", href: "/clients" },
    { label: "Win Rate", value: `${winRate}%`, change: `${wonLeads.length} won`, icon: Target, color: "#FF6B00", href: "/pipeline" },
    { label: "Pipeline", value: formatCurrency(pipelineValue, true), change: `${openLeads} active`, icon: Briefcase, color: "#06B6D4", href: "/pipeline" },
  ];

  // Second row KPIs
  const kpis2 = [
    { label: "Team", value: String(teamCount), sub: "across 3 companies", icon: Users, color: "#F59E0B" },
    { label: "Avg Deal", value: formatCurrency(avgDealSize, true), sub: "per closed deal", icon: DollarSign, color: "#10B981" },
    { label: "Health Score", value: `${avgHealth}%`, sub: "avg client health", icon: Star, color: avgHealth >= 80 ? "#10B981" : "#F59E0B" },
    { label: "Tasks Done", value: `${completedTasks}/${totalTasks}`, sub: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion`, icon: CheckSquare, color: "#3B82F6" },
  ];

  const taskStatuses = [
    { name: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, color: "#3B82F6" },
    { name: "Review", value: tasks.filter((t) => t.status === "REVIEW").length, color: "#F59E0B" },
    { name: "To Do", value: tasks.filter((t) => t.status === "TODO").length, color: "#F59E0B" },
    { name: "Completed", value: completedTasks, color: "#10B981" },
  ];

  const activityIcons: Record<string, { color: string; Icon: typeof Activity }> = {
    task_completed: { color: "#10B981", Icon: CheckCircle2 },
    lead_won: { color: "#F59E0B", Icon: Trophy },
    invoice_paid: { color: "#3B82F6", Icon: DollarSign },
    client_update: { color: "#F59E0B", Icon: BarChart3 },
    campaign_launch: { color: "#FF6B00", Icon: Rocket },
    security_audit: { color: "#06B6D4", Icon: Shield },
    ai_deployment: { color: "#EC4899", Icon: Cpu },
    performance_report: { color: "#22C55E", Icon: TrendingUp },
  };

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
            <Zap className="w-5 h-5 text-[var(--primary)]" />
          </h2>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-0.5">Here&apos;s what&apos;s happening across your companies</p>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Link key={i} href={kpi.href} className="kpi-card card-interactive group animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}12` }}>
                  <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/8 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />{kpi.change}
                </span>
              </div>
              <p className="text-[10px] font-medium text-[var(--foreground-dim)] mb-0.5 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-[22px] font-bold text-[var(--foreground)] tabular-nums tracking-tight">
                {loading ? <span className="skeleton inline-block h-7 w-20" /> : kpi.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary KPIs — smaller, info-only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis2.map((kpi, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kpi.color}10` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--foreground)] tabular-nums">{kpi.value}</p>
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
                  <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B00" stopOpacity={0.25} /><stop offset="100%" stopColor="#FF6B00" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="100%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
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
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color, boxShadow: `0 0 6px ${b.color}40` }} />
                <span className="text-[11px] text-[var(--foreground-dim)] font-medium">{b.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel — NEW from Smartsheet */}
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Sales Funnel</h3>
            <Link href="/pipeline" className="text-[11px] text-[var(--primary)] hover:text-[var(--primary-light)] flex items-center gap-1 transition-colors">
              Pipeline <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const maxCount = Math.max(...funnelData.map((s) => s.count), 1);
              const pct = Math.round((stage.count / maxCount) * 100);
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--foreground-dim)]">{stage.stage}</span>
                    <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: stage.color, boxShadow: `0 0 8px ${stage.color}30` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider">Win Rate</p>
              <p className="text-[18px] font-bold text-emerald-400 tabular-nums">{winRate}%</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider">Lost</p>
              <p className="text-[18px] font-bold text-red-400 tabular-nums">{lostLeads.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row — Lead Sources + Service Breakdown + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Sources — NEW from Smartsheet */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Lead Sources</h3>
          <div className="space-y-3">
            {leadSources.map((src) => {
              const colors: Record<string, string> = { Website: "#3B82F6", LinkedIn: "#06B6D4", Referral: "#10B981", "Cold Outreach": "#F59E0B" };
              const c = colors[src.name] || "#FF6B00";
              return (
                <div key={src.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-[12px] text-[var(--foreground-muted)] flex-1">{src.name}</span>
                  <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">{src.count}</span>
                  <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums w-8 text-right">{leads.length > 0 ? Math.round((src.count / leads.length) * 100) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Revenue Breakdown — NEW */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Services</h3>
          <div className="space-y-3">
            {serviceTypes.map((svc) => (
              <div key={svc.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[var(--foreground-dim)] truncate flex-1 mr-2">{svc.name}</span>
                  <span className="text-[11px] font-medium text-[var(--foreground)] tabular-nums">{formatCurrency(svc.revenue, true)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${svc.percentage}%`, backgroundColor: svc.color }} />
                </div>
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
              <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`, background: `linear-gradient(90deg, #10B981, #34D399)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Satisfaction */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Satisfaction</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[20px] font-bold text-emerald-400 tabular-nums">{avgHealth}%</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-[var(--foreground)] tabular-nums">{clients.filter(c => c.healthScore >= 80).length}</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">Healthy</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-amber-400 tabular-nums">{clients.filter(c => c.healthScore < 80).length}</p>
              <p className="text-[9px] text-[var(--foreground-dim)] uppercase">At Risk</p>
            </div>
          </div>
          <div className="space-y-2">
            {clients.filter(c => c.healthScore < 90).slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                <span className="text-[11px] text-[var(--foreground-muted)] truncate">{c.companyName}</span>
                <span className="text-[11px] font-medium tabular-nums" style={{ color: c.healthScore >= 80 ? "#10B981" : "#F59E0B" }}>{c.healthScore}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Follow-Up Alerts */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-1">Action Needed</h3>
          <p className="text-[11px] text-[var(--foreground-dim)] mb-4">Overdue tasks &amp; pipeline items</p>
          <div className="space-y-2">
            {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED" && t.status !== "REVIEW").slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <CheckSquare className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[11px] text-[var(--foreground-muted)] truncate flex-1">{t.title}</span>
                <span className="text-[10px] text-red-400 tabular-nums shrink-0">{t.dueDate}</span>
              </div>
            ))}
            {leads.filter(l => l.status === "NEW").slice(0, 2).map(l => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-[var(--foreground-muted)] truncate flex-1">{l.companyName}</span>
                <span className="text-[10px] text-amber-400 shrink-0">New lead</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">This Month</h3>
          <div className="space-y-3">
            {[
              { label: "Revenue", current: "$340.9K", prev: "$299.0K", change: "+14%", color: "#10B981" },
              { label: "New Leads", current: String(leads.filter(l => l.status === "NEW").length), prev: "3", change: "+33%", color: "#3B82F6" },
              { label: "Tasks Done", current: String(completedTasks), prev: "8", change: "-", color: "#FF6B00" },
              { label: "Deals Won", current: String(wonLeads.length), prev: "2", change: "-", color: "#F59E0B" },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[11px] text-[var(--foreground-dim)]">{m.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">{m.current}</span>
                  <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">vs {m.prev}</span>
                  <span className="text-[10px] font-medium text-emerald-400">{m.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Clients with health + last activity */}
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Top Clients</h3>
            <Link href="/clients" className="text-[11px] text-[var(--primary)] hover:text-[var(--primary-light)] flex items-center gap-1 transition-colors">All clients <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-1">
            {clients.slice(0, 5).map((client, i) => {
              const bc = client.brand === "VCS" ? "#FF6B00" : client.brand === "BSL" ? "#3B82F6" : "#22C55E";
              return (
                <div key={client.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-all group cursor-pointer">
                  <div className="w-[24px] text-[11px] text-[var(--foreground-dim)] tabular-nums font-medium text-center">{i + 1}</div>
                  <div className="avatar w-8 h-8 text-[11px]" style={{ backgroundColor: `${bc}12`, color: bc }}>{client.companyName.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">{client.companyName}</p>
                    <p className="text-[10px] text-[var(--foreground-dim)]">{client.brand} &middot; {client.lastActivity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold text-emerald-400 tabular-nums">{formatCurrency(client.mrr)}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <div className="w-8 h-1 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${client.healthScore}%`, backgroundColor: client.healthScore >= 80 ? "#10B981" : "#F59E0B" }} />
                      </div>
                      <span className="text-[9px] tabular-nums" style={{ color: client.healthScore >= 80 ? "#10B981" : "#F59E0B" }}>{client.healthScore}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">Activity</h3>
            <span className="text-[11px] text-[var(--foreground-dim)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full">Last 24h</span>
          </div>
          <div className="space-y-0.5">
            {activities.slice(0, 6).map((a) => {
              const cfg = activityIcons[a.type] || { color: "#FF6B00", Icon: Activity };
              return (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-all group cursor-pointer">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${cfg.color}10` }}>
                    <cfg.Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed group-hover:text-[var(--foreground)] transition-colors">{a.message}</p>
                    <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
