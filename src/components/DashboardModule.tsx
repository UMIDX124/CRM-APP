"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Building2,
  DollarSign,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Calendar,
  Target,
  Briefcase,
  Activity,
} from "lucide-react";
import { clsx } from "clsx";
import { dashboardKPIs, clients, employees, tasks, revenueData, activities } from "@/data/mock-data";

interface DashboardModuleProps {
  brandId: string;
  brandColor: string;
}

export default function DashboardModule({ brandId, brandColor }: DashboardModuleProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [brandId]);

  const brandClients = clients.filter(c => c.brand === "VCS" || c.brand === "BSL" || c.brand === "DPL");
  const brandEmployees = employees.filter(e => e.brand === "VCS" || e.brand === "BSL" || e.brand === "DPL");
  const brandTasks = tasks.filter(t => t.brand === "VCS" || t.brand === "BSL" || t.brand === "DPL");
  const completedTasks = brandTasks.filter(t => t.status === "DONE").length;
  const totalRevenue = brandClients.reduce((sum, c) => sum + (c.mrr || 0), 0);

  const kpis = [
    {
      label: "Total Revenue",
      value: `$${(totalRevenue / 1000).toFixed(1)}K`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "#22C55E",
    },
    {
      label: "Active Clients",
      value: brandClients.length.toString(),
      change: "+3",
      trend: "up",
      icon: Building2,
      color: "#3B82F6",
    },
    {
      label: "Team Members",
      value: brandEmployees.length.toString(),
      change: "+2",
      trend: "up",
      icon: Users,
      color: "#8B5CF6",
    },
    {
      label: "Tasks Done",
      value: `${completedTasks}/${brandTasks.length}`,
      change: "85%",
      trend: "up",
      icon: CheckSquare,
      color: brandColor,
    },
  ];

  const quickActions = [
    { label: "Add Client", icon: Plus, color: "#22C55E" },
    { label: "New Task", icon: CheckSquare, color: "#3B82F6" },
    { label: "Schedule", icon: Calendar, color: "#8B5CF6" },
    { label: "Report", icon: Target, color: "#D4AF37" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <p className="text-white/50 text-sm mt-1">Here's what's happening today</p>
        </div>
        <div className="flex gap-2">
          {["7d", "30d", "90d"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                timeRange === range
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className={clsx(
              "group relative overflow-hidden rounded-2xl p-5 transition-all duration-500 hover-lift",
              "bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10",
"hover:border-white/20 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1"
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
              <p className="text-white/50 text-xs font-medium mb-1">{kpi.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-white">{loading ? "..." : kpi.value}</p>
                <span
                  className={clsx(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                    kpi.trend === "up" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {kpi.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${action.color}20` }}
            >
              <action.icon className="w-5 h-5" style={{ color: action.color }} />
            </div>
            <span className="text-sm font-medium text-white/80 group-hover:text-white">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart Area */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
              <p className="text-white/50 text-sm">Monthly performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +24.5%
              </span>
            </div>
          </div>
          
          {/* Recharts Area Chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashVcsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashBslGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashDplGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                  dx={-10}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0);
                    return (
                      <div className="bg-[#0f0f18] border border-white/20 rounded-xl p-4 shadow-2xl">
                        <p className="text-white/60 text-sm mb-3 font-medium">{label}</p>
                        <div className="space-y-2">
                          {payload.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-white/60 text-xs">{(entry.name as string).toUpperCase()}</span>
                              </div>
                              <span className="text-white font-medium text-sm">
                                ${(entry.value as number).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
                          <span className="text-white/40 text-xs">Total</span>
                          <span className="text-[#D4AF37] font-semibold text-sm">${total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vcs"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="url(#dashVcsGradient)"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="bsl"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#dashBslGradient)"
                  animationDuration={1500}
                  animationBegin={200}
                />
                <Area
                  type="monotone"
                  dataKey="dpl"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#dashDplGradient)"
                  animationDuration={1500}
                  animationBegin={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Activity</h3>
            <button className="text-xs text-[#D4AF37] hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Activity className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{activity.message}</p>
                  <p className="text-xs text-white/40 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client & Task Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Clients</h3>
            <button className="text-xs text-[#D4AF37] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {brandClients.slice(0, 5).map((client, i) => (
              <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{client.companyName}</p>
                  <p className="text-xs text-white/40">{client.country}</p>
                </div>
                <span className="text-sm font-semibold text-[#22C55E]">
                  ${((client.mrr || 0) / 1000).toFixed(1)}K
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Task Status</h3>
            <button className="text-xs text-[#D4AF37] hover:underline">View All</button>
          </div>
          {(() => {
            const taskStatuses = [
              { name: "Completed", value: brandTasks.filter(t => t.status === "DONE").length, color: "#22C55E" },
              { name: "In Progress", value: brandTasks.filter(t => t.status === "IN_PROGRESS").length, color: "#3B82F6" },
              { name: "Review", value: brandTasks.filter(t => t.status === "TODO").length, color: "#F59E0B" },
              { name: "To Do", value: brandTasks.filter(t => t.status === "BLOCKED").length, color: "#EF4444" },
            ];
            const totalTasks = taskStatuses.reduce((sum, s) => sum + s.value, 0);
            return (
              <div className="flex items-center gap-6">
                {/* Donut Chart */}
                <div className="relative w-[170px] h-[170px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatuses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={1200}
                        animationBegin={200}
                      >
                        {taskStatuses.map((entry, index) => (
                          <Cell
                            key={`task-cell-${index}`}
                            fill={entry.color}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0f0f18] border border-white/20 rounded-xl p-3 shadow-2xl">
                              <p className="text-white font-medium text-sm">{data.name}</p>
                              <p className="text-white/60 text-xs mt-1">{data.value} tasks</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-white">{totalTasks}</span>
                    <span className="text-xs text-white/40">Total</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {taskStatuses.map((status) => (
                    <div key={status.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="text-sm text-white/70">{status.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
