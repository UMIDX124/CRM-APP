"use client";

import { TrendingUp, TrendingDown, Users, DollarSign, CheckSquare, Activity } from "lucide-react";
import { clsx } from "clsx";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
}

function KPICard({ title, value, change, changeLabel, icon: Icon, iconColor, trend = "neutral" }: KPICardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-5 hover:border-white/20 transition-all duration-300 group">
      {/* Background Glow */}
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
              trend === "neutral" && "bg-white/10 text-white/60"
            )}
          >
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
        {changeLabel && <p className="text-xs text-white/30 mt-1">{changeLabel}</p>}
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
}

export default function KPICards({ kpis }: KPICardsProps) {
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
        iconColor="#D4AF37"
        trend="up"
      />
      <KPICard
        title="Revenue This Month"
        value={formatCurrency(kpis.revenueThisMonth)}
        change={8.5}
        changeLabel="vs last month"
        icon={DollarSign}
        iconColor="#22C55E"
        trend="up"
      />
      <KPICard
        title="Open Tasks"
        value={kpis.openTasks}
        change={-5}
        changeLabel="vs last week"
        icon={CheckSquare}
        iconColor="#3B82F6"
        trend="down"
      />
      <KPICard
        title="Employee Utilization"
        value={`${kpis.employeeUtilization}%`}
        change={3}
        changeLabel="vs last week"
        icon={Activity}
        iconColor="#8B5CF6"
        trend="up"
      />
    </div>
  );
}
