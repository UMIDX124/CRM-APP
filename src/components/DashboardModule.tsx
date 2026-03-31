"use client";

import { useState, useEffect } from "react";
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
              "group relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
              "bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10",
"hover:border-white/20 hover:shadow-xl hover:shadow-black/20"
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
          
          {/* Simple Bar Chart */}
          <div className="h-48 flex items-end gap-3">
            {revenueData.slice(0, 6).map((data, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-white/40 mb-1">${((data.vcs + data.bsl + data.dpl) / 1000).toFixed(0)}K</span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${(Math.max(data.vcs, data.bsl, data.dpl) / Math.max(...revenueData.map(d => Math.max(d.vcs, d.bsl, d.dpl)))) * 100}%`,
                      backgroundColor: i === 5 ? brandColor : `${brandColor}60`,
                      minHeight: "20px",
                    }}
                  />
                </div>
                <span className="text-xs text-white/40">{data.month.slice(0, 3)}</span>
              </div>
            ))}
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
          <div className="space-y-4">
            {[
              { label: "Completed", count: brandTasks.filter(t => t.status === "DONE").length, color: "#22C55E" },
              { label: "In Progress", count: brandTasks.filter(t => t.status === "IN_PROGRESS").length, color: "#3B82F6" },
              { label: "To Do", count: brandTasks.filter(t => t.status === "TODO").length, color: "#F59E0B" },
              { label: "Blocked", count: brandTasks.filter(t => t.status === "BLOCKED").length, color: "#EF4444" },
            ].map((status, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{status.label}</span>
                  <span className="text-sm font-semibold text-white">{status.count}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${brandTasks.length > 0 ? (status.count / brandTasks.length) * 100 : 0}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
