"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, DollarSign, CheckSquare, Activity } from "lucide-react";
import { clsx } from "clsx";

function useRelativeTime(timestamp: number) {
  const [text, setText] = useState(() => formatRelative(timestamp));

  useEffect(() => {
    setText(formatRelative(timestamp));
    const id = setInterval(() => setText(formatRelative(timestamp)), 60_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return text;
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "Just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  return rtf.format(-Math.floor(diff / 86400), "day");
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  lastUpdated?: number;
}

function KPICard({ title, value, change, changeLabel, icon: Icon, iconColor, trend = "neutral", loading, lastUpdated }: KPICardProps) {
  const relTime = useRelativeTime(lastUpdated || Date.now());

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 skeleton rounded-xl" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-24 skeleton rounded" />
          <div className="h-4 w-20 skeleton rounded" />
          <div className="h-3 w-28 skeleton rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5 hover:border-[var(--border-hover)] transition-all duration-300 group">
      <div
        className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: iconColor }}
      />
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${iconColor}20` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {change !== undefined && (
          <div
            className={clsx(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" && "bg-emerald-500/20 text-emerald-400",
              trend === "down" && "bg-red-500/20 text-red-400",
              trend === "neutral" && "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
            )}
          >
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--foreground)] mb-1 tracking-tight">{value}</p>
        <p className="text-sm text-[var(--foreground-dim)]">{title}</p>
        {changeLabel && <p className="text-xs text-[var(--foreground-dim)] mt-1">{changeLabel}</p>}
        <p className="text-xs text-[var(--foreground-dim)] mt-1.5 tabular-nums">
          {relTime}
        </p>
      </div>
    </div>
  );
}

interface KPICardsProps {
  kpis: {
    totalActiveClients: number;
    revenueThisMonth: number;
    openTasks: number;
    employeeUtilization: number;
  };
  loading?: boolean;
  lastUpdated?: number;
}

export default function KPICards({ kpis, loading, lastUpdated }: KPICardsProps) {
  const ts = lastUpdated || Date.now();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard
        title="Active Clients"
        value={kpis.totalActiveClients}
        change={12}
        changeLabel="vs last month"
        icon={Users}
        iconColor="var(--primary)"
        trend="up"
        loading={loading}
        lastUpdated={ts}
      />
      <KPICard
        title="Revenue This Month"
        value={formatCurrency(kpis.revenueThisMonth)}
        change={8.5}
        changeLabel="vs last month"
        icon={DollarSign}
        iconColor="var(--emerald)"
        trend="up"
        loading={loading}
        lastUpdated={ts}
      />
      <KPICard
        title="Open Tasks"
        value={kpis.openTasks}
        change={-5}
        changeLabel="vs last week"
        icon={CheckSquare}
        iconColor="var(--blue)"
        trend="down"
        loading={loading}
        lastUpdated={ts}
      />
      <KPICard
        title="Employee Utilization"
        value={`${kpis.employeeUtilization}%`}
        change={3}
        changeLabel="vs last week"
        icon={Activity}
        iconColor="var(--warning)"
        trend="up"
        loading={loading}
        lastUpdated={ts}
      />
    </div>
  );
}
