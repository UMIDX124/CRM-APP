"use client";

import { useState, useMemo } from "react";
import {
  Clock, UserCheck, UserX, Coffee, Laptop, CalendarOff, ChevronLeft, ChevronRight,
  Search, Filter, Download, CheckCircle2, XCircle, AlertCircle, Timer, MapPin,
} from "lucide-react";
import { clsx } from "clsx";
import { employees, attendanceRecords, brands, parentCompany } from "@/data/mock-data";
import type { AttendanceStatus, AttendanceRecord } from "@/data/mock-data";

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: typeof UserCheck }> = {
  PRESENT: { label: "Present", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: UserCheck },
  ABSENT: { label: "Absent", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: UserX },
  LATE: { label: "Late", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  HALF_DAY: { label: "Half Day", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: Timer },
  REMOTE: { label: "Remote", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: Laptop },
  LEAVE: { label: "On Leave", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: CalendarOff },
};

export default function AttendanceModule({ brandId }: { brandId: string }) {
  const [selectedDate, setSelectedDate] = useState("2026-04-02");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">("ALL");
  const [filterBrand, setFilterBrand] = useState<string>("ALL");

  const filteredRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.date === selectedDate)
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        return { ...r, employee: emp };
      })
      .filter((r) => {
        if (!r.employee) return false;
        if (search && !r.employee.name.toLowerCase().includes(search.toLowerCase()) && !r.employee.email.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
        if (filterBrand !== "ALL" && r.employee.brand !== filterBrand) return false;
        return true;
      });
  }, [selectedDate, search, filterStatus, filterBrand]);

  // Stats for selected date
  const stats = useMemo(() => {
    const dayRecords = attendanceRecords.filter((r) => r.date === selectedDate);
    const present = dayRecords.filter((r) => r.status === "PRESENT").length;
    const remote = dayRecords.filter((r) => r.status === "REMOTE").length;
    const late = dayRecords.filter((r) => r.status === "LATE").length;
    const absent = dayRecords.filter((r) => r.status === "ABSENT").length;
    const leave = dayRecords.filter((r) => r.status === "LEAVE").length;
    const avgHours = dayRecords.filter((r) => r.hoursWorked > 0).reduce((a, r) => a + r.hoursWorked, 0) / (present + remote + late || 1);
    return { present, remote, late, absent, leave, total: dayRecords.length, avgHours: Math.round(avgHours * 10) / 10 };
  }, [selectedDate]);

  const navigateDate = (direction: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#D4AF37";

  return (
    <div className="space-y-6">
      {/* Header with FU Corp badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold tracking-wider">
              {parentCompany.code} CORP
            </span>
            <span className="text-white/30 text-xs">Centralized Hiring</span>
          </div>
          <p className="text-white/50 text-sm">All employees hired by FU Corp, assigned to subsidiaries</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <button onClick={() => navigateDate(-1)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{formatDate(selectedDate)}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {stats.total} employees tracked &bull; {stats.avgHours}h avg work time
          </p>
        </div>
        <button onClick={() => navigateDate(1)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Present", value: stats.present, color: "emerald", icon: UserCheck },
          { label: "Remote", value: stats.remote, color: "cyan", icon: Laptop },
          { label: "Late", value: stats.late, color: "amber", icon: AlertCircle },
          { label: "Absent", value: stats.absent, color: "red", icon: UserX },
          { label: "On Leave", value: stats.leave, color: "purple", icon: CalendarOff },
          { label: "Avg Hours", value: stats.avgHours, color: "blue", icon: Clock },
        ].map((stat, i) => (
          <div
            key={i}
            className={clsx(
              "p-4 rounded-xl border transition-all hover-lift",
              `bg-${stat.color}-500/5 border-${stat.color}-500/10`
            )}
            style={{ background: `rgba(var(--${stat.color === "blue" ? "cyan" : stat.color === "amber" ? "warning" : stat.color}-rgb, 0), 0.05)` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 text-${stat.color}-400`} style={{ color: stat.color === "emerald" ? "#10B981" : stat.color === "cyan" ? "#0EA5E9" : stat.color === "amber" ? "#F59E0B" : stat.color === "red" ? "#EF4444" : stat.color === "purple" ? "#8B5CF6" : "#3B82F6" }} />
              <span className="text-xs text-white/50">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}{stat.label === "Avg Hours" ? "h" : ""}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AttendanceStatus | "ALL")}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer"
        >
          <option value="ALL" className="bg-[#0f0f1e]">All Status</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key} className="bg-[#0f0f1e]">{cfg.label}</option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer"
        >
          <option value="ALL" className="bg-[#0f0f1e]">All Companies</option>
          {brands.map((b) => (
            <option key={b.code} value={b.code} className="bg-[#0f0f1e]">{b.code} - {b.name}</option>
          ))}
        </select>
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Check In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Hours</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/30 text-sm">
                    No attendance records for this date
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const cfg = statusConfig[record.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={record.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-white/80">
                              {record.employee?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{record.employee?.name}</p>
                            <p className="text-xs text-white/40">{record.employee?.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-md text-[11px] font-bold border"
                          style={{
                            color: brandColor(record.employee?.brand || ""),
                            borderColor: brandColor(record.employee?.brand || "") + "30",
                            backgroundColor: brandColor(record.employee?.brand || "") + "10",
                          }}
                        >
                          {record.employee?.brand}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                          <StatusIcon className={clsx("w-3.5 h-3.5", cfg.color)} />
                          <span className={cfg.color}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white/70 font-mono">
                          {record.checkIn || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white/70 font-mono">
                          {record.checkOut || (record.checkIn ? <span className="text-cyan-400 text-xs">Active</span> : "—")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-sm font-medium", record.hoursWorked >= 8 ? "text-emerald-400" : record.hoursWorked > 0 ? "text-amber-400" : "text-white/30")}>
                          {record.hoursWorked > 0 ? `${record.hoursWorked}h` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary by Company */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brands.map((brand) => {
          const brandRecords = attendanceRecords
            .filter((r) => r.date === selectedDate)
            .filter((r) => employees.find((e) => e.id === r.employeeId)?.brand === brand.code);
          const present = brandRecords.filter((r) => ["PRESENT", "REMOTE"].includes(r.status)).length;
          const total = brandRecords.length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;

          return (
            <div key={brand.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                  <span className="text-sm font-medium text-white">{brand.code}</span>
                </div>
                <span className="text-xs text-white/40">{brand.name}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{rate}%</p>
                  <p className="text-xs text-white/40">attendance rate</p>
                </div>
                <p className="text-sm text-white/50">{present}/{total} present</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${rate}%`, backgroundColor: brand.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
