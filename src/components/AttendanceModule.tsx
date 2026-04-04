"use client";

import { useState, useMemo } from "react";
import {
  Clock, UserCheck, UserX, Coffee, Laptop, CalendarOff, ChevronLeft, ChevronRight,
  Search, Download, CheckCircle2, AlertCircle, Timer, Calendar, BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { employees, attendanceRecords, brands, parentCompany } from "@/data/mock-data";
import type { AttendanceStatus, AttendanceRecord } from "@/data/mock-data";
import { downloadCSV } from "@/lib/api";

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: typeof UserCheck }> = {
  PRESENT: { label: "Present", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: UserCheck },
  ABSENT: { label: "Absent", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: UserX },
  LATE: { label: "Late", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  HALF_DAY: { label: "Half Day", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: Timer },
  REMOTE: { label: "Remote", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: Laptop },
  LEAVE: { label: "On Leave", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: CalendarOff },
};

type ViewMode = "daily" | "monthly" | "range";

export default function AttendanceModule({ brandId }: { brandId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState("2026-04-02");
  const [rangeStart, setRangeStart] = useState("2026-03-28");
  const [rangeEnd, setRangeEnd] = useState("2026-04-02");
  const [selectedMonth, setSelectedMonth] = useState("2026-04");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">("ALL");
  const [filterBrand, setFilterBrand] = useState<string>("ALL");

  // Daily view records
  const dailyRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.date === selectedDate)
      .map((r) => ({ ...r, employee: employees.find((e) => e.id === r.employeeId) }))
      .filter((r) => {
        if (!r.employee) return false;
        if (search && !r.employee.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
        if (filterBrand !== "ALL" && r.employee.brand !== filterBrand) return false;
        return true;
      });
  }, [selectedDate, search, filterStatus, filterBrand]);

  // Monthly view — per employee, all days of the month
  const monthlyData = useMemo(() => {
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(yr, mo - 1, i + 1);
      return d.toISOString().split("T")[0];
    });

    return employees
      .filter((emp) => {
        if (filterBrand !== "ALL" && emp.brand !== filterBrand) return false;
        if (search && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .map((emp) => {
        const records: Record<string, AttendanceRecord | undefined> = {};
        days.forEach((day) => {
          records[day] = attendanceRecords.find((r) => r.employeeId === emp.id && r.date === day);
        });
        const presentCount = Object.values(records).filter((r) => r && ["PRESENT", "REMOTE"].includes(r.status)).length;
        const totalWorking = days.filter((d) => { const dt = new Date(d); return dt.getDay() !== 0 && dt.getDay() !== 6; }).length;
        return { employee: emp, records, days, presentCount, totalWorking, rate: totalWorking > 0 ? Math.round((presentCount / totalWorking) * 100) : 0 };
      });
  }, [selectedMonth, search, filterBrand]);

  // Range view — aggregate stats per employee for date range
  const rangeData = useMemo(() => {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    return employees
      .filter((emp) => {
        if (filterBrand !== "ALL" && emp.brand !== filterBrand) return false;
        if (search && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .map((emp) => {
        const records = attendanceRecords.filter((r) => {
          const d = new Date(r.date);
          return r.employeeId === emp.id && d >= start && d <= end;
        });
        const present = records.filter((r) => r.status === "PRESENT").length;
        const remote = records.filter((r) => r.status === "REMOTE").length;
        const late = records.filter((r) => r.status === "LATE").length;
        const absent = records.filter((r) => r.status === "ABSENT").length;
        const leave = records.filter((r) => r.status === "LEAVE").length;
        const totalHours = records.reduce((a, r) => a + r.hoursWorked, 0);
        const avgHours = records.length > 0 ? Math.round((totalHours / records.filter(r => r.hoursWorked > 0).length) * 10) / 10 : 0;
        return { employee: emp, present, remote, late, absent, leave, total: records.length, totalHours: Math.round(totalHours * 10) / 10, avgHours };
      });
  }, [rangeStart, rangeEnd, search, filterBrand]);

  // Stats for daily view
  const dailyStats = useMemo(() => {
    const dayRecords = attendanceRecords.filter((r) => r.date === selectedDate);
    return {
      present: dayRecords.filter((r) => r.status === "PRESENT").length,
      remote: dayRecords.filter((r) => r.status === "REMOTE").length,
      late: dayRecords.filter((r) => r.status === "LATE").length,
      absent: dayRecords.filter((r) => r.status === "ABSENT").length,
      leave: dayRecords.filter((r) => r.status === "LEAVE").length,
      total: dayRecords.length,
      avgHours: Math.round((dayRecords.filter((r) => r.hoursWorked > 0).reduce((a, r) => a + r.hoursWorked, 0) / (dayRecords.filter(r => r.hoursWorked > 0).length || 1)) * 10) / 10,
    };
  }, [selectedDate]);

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const navigateMonth = (dir: number) => {
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const d = new Date(yr, mo - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const formatDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatMonth = (s: string) => { const [yr, mo] = s.split("-"); return new Date(Number(yr), Number(mo) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); };
  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  const statusDot = (status?: AttendanceStatus) => {
    if (!status) return "bg-[var(--surface-hover)]";
    const map: Record<string, string> = { PRESENT: "bg-emerald-400", REMOTE: "bg-cyan-400", LATE: "bg-amber-400", ABSENT: "bg-red-400", LEAVE: "bg-amber-400", HALF_DAY: "bg-orange-400" };
    return map[status] || "bg-[var(--surface-hover)]";
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-[10px] font-bold tracking-wider">{parentCompany.code} CORP</span>
            <span className="text-[var(--foreground-dim)] text-xs">Centralized Attendance</span>
          </div>
          <p className="text-[var(--foreground-dim)] text-sm">Track attendance across all subsidiaries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadCSV("attendance")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] w-fit">
        {([["daily", "Daily", Clock], ["monthly", "Monthly", Calendar], ["range", "Date Range", BarChart3]] as const).map(([mode, label, Icon]) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              viewMode === mode ? "bg-[var(--surface-hover)] text-[var(--foreground)]" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Date Controls */}
      {viewMode === "daily" && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"><ChevronLeft className="w-5 h-5" /></button>
          <div className="text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">{formatDate(selectedDate)}</p>
            <p className="text-xs text-[var(--foreground-dim)] mt-0.5">{dailyStats.total} employees &bull; {dailyStats.avgHours}h avg</p>
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}

      {viewMode === "monthly" && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"><ChevronLeft className="w-5 h-5" /></button>
          <p className="text-lg font-semibold text-[var(--foreground)]">{formatMonth(selectedMonth)}</p>
          <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}

      {viewMode === "range" && (
        <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--foreground-dim)] uppercase tracking-wider">From</label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
          </div>
          <span className="text-[var(--foreground-dim)]">to</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--foreground-dim)] uppercase tracking-wider">To</label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
          </div>
        </div>
      )}

      {/* Stats (daily view) */}
      {viewMode === "daily" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Present", value: dailyStats.present, color: "#10B981" },
            { label: "Remote", value: dailyStats.remote, color: "#0EA5E9" },
            { label: "Late", value: dailyStats.late, color: "#F59E0B" },
            { label: "Absent", value: dailyStats.absent, color: "#EF4444" },
            { label: "On Leave", value: dailyStats.leave, color: "#F59E0B" },
            { label: "Avg Hours", value: `${dailyStats.avgHours}h`, color: "#3B82F6" },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-[var(--foreground-dim)]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
          <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
        </div>
        {viewMode === "daily" && (
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AttendanceStatus | "ALL")}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground-muted)] cursor-pointer">
            <option value="ALL" className="bg-[#0f0f1e]">All Status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k} className="bg-[#0f0f1e]">{v.label}</option>)}
          </select>
        )}
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground-muted)] cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Companies</option>
          {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#0f0f1e]">{b.code}</option>)}
        </select>
      </div>

      {/* DAILY TABLE */}
      {viewMode === "daily" && (
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Check In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Hours</th>
              </tr>
            </thead>
            <tbody>
              {dailyRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[var(--foreground-dim)] text-sm">No records for this date</td></tr>
              ) : dailyRecords.map((r) => {
                const cfg = statusConfig[r.status];
                const Icon = cfg.icon;
                return (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-[var(--foreground-muted)]">{r.employee?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                        </div>
                        <div><p className="text-sm font-medium text-[var(--foreground)]">{r.employee?.name}</p><p className="text-xs text-[var(--foreground-dim)]">{r.employee?.title}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border" style={{ color: brandColor(r.employee?.brand || ""), borderColor: brandColor(r.employee?.brand || "") + "30", backgroundColor: brandColor(r.employee?.brand || "") + "10" }}>{r.employee?.brand}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                        <Icon className={clsx("w-3.5 h-3.5", cfg.color)} /><span className={cfg.color}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-[var(--foreground-muted)] font-mono">{r.checkIn || "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-[var(--foreground-muted)] font-mono">{r.checkOut || (r.checkIn ? <span className="text-cyan-400 text-xs">Active</span> : "—")}</span></td>
                    <td className="px-4 py-3"><span className={clsx("text-sm font-medium", r.hoursWorked >= 8 ? "text-emerald-400" : r.hoursWorked > 0 ? "text-amber-400" : "text-[var(--foreground-dim)]")}>{r.hoursWorked > 0 ? `${r.hoursWorked}h` : "—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MONTHLY GRID */}
      {viewMode === "monthly" && (
        <div className="rounded-2xl border border-[var(--border)] overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider sticky left-0 bg-[var(--surface)] z-10 min-w-[180px]">Employee</th>
                {monthlyData[0]?.days.map((day) => {
                  const d = new Date(day);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={day} className={clsx("text-center px-1 py-3 text-[10px] font-medium uppercase tracking-wider min-w-[28px]", isWeekend ? "text-[var(--foreground-dim)]" : "text-[var(--foreground-dim)]")}>
                      {d.getDate()}
                    </th>
                  );
                })}
                <th className="text-center px-3 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Rate</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row) => (
                <tr key={row.employee.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="px-4 py-2 sticky left-0 bg-[#060610] z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--foreground)] font-medium truncate">{row.employee.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ color: brandColor(row.employee.brand), backgroundColor: brandColor(row.employee.brand) + "10" }}>{row.employee.brand}</span>
                    </div>
                  </td>
                  {row.days.map((day) => {
                    const d = new Date(day);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const record = row.records[day];
                    return (
                      <td key={day} className="text-center px-1 py-2">
                        {isWeekend ? (
                          <div className="w-4 h-4 mx-auto rounded-full bg-[var(--surface)]" />
                        ) : (
                          <div className={clsx("w-4 h-4 mx-auto rounded-full", record ? statusDot(record.status) : "bg-[var(--surface-elevated)]")}
                            title={record ? `${statusConfig[record.status].label}${record.hoursWorked ? ` (${record.hoursWorked}h)` : ""}` : "No record"} />
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-2">
                    <span className={clsx("text-sm font-bold", row.rate >= 90 ? "text-emerald-400" : row.rate >= 70 ? "text-amber-400" : "text-red-400")}>{row.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RANGE REPORT */}
      {viewMode === "range" && (
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Employee</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-emerald-400/60 uppercase tracking-wider">Present</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-cyan-400/60 uppercase tracking-wider">Remote</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-amber-400/60 uppercase tracking-wider">Late</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-red-400/60 uppercase tracking-wider">Absent</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-amber-400/60 uppercase tracking-wider">Leave</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Total Hrs</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {rangeData.map((row) => (
                <tr key={row.employee.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[var(--foreground-muted)]">{(row.employee?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{row.employee.name}</p>
                        <p className="text-[10px] text-[var(--foreground-dim)]">{row.employee.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3"><span className="text-sm font-medium text-emerald-400">{row.present}</span></td>
                  <td className="text-center px-3 py-3"><span className="text-sm font-medium text-cyan-400">{row.remote}</span></td>
                  <td className="text-center px-3 py-3"><span className="text-sm font-medium text-amber-400">{row.late}</span></td>
                  <td className="text-center px-3 py-3"><span className="text-sm font-medium text-red-400">{row.absent}</span></td>
                  <td className="text-center px-3 py-3"><span className="text-sm font-medium text-amber-400">{row.leave}</span></td>
                  <td className="text-center px-3 py-3"><span className="text-sm text-[var(--foreground-muted)]">{row.totalHours}h</span></td>
                  <td className="text-center px-3 py-3"><span className={clsx("text-sm font-medium", row.avgHours >= 8 ? "text-emerald-400" : row.avgHours > 0 ? "text-amber-400" : "text-[var(--foreground-dim)]")}>{row.avgHours}h</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Company breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brands.map((brand) => {
          const brandEmployees = employees.filter((e) => e.brand === brand.code);
          const brandRecords = viewMode === "daily"
            ? attendanceRecords.filter((r) => r.date === selectedDate && brandEmployees.some((e) => e.id === r.employeeId))
            : attendanceRecords.filter((r) => brandEmployees.some((e) => e.id === r.employeeId));
          const present = brandRecords.filter((r) => ["PRESENT", "REMOTE"].includes(r.status)).length;
          const total = brandRecords.length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;

          return (
            <div key={brand.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                  <span className="text-sm font-medium text-[var(--foreground)]">{brand.code}</span>
                </div>
                <span className="text-xs text-[var(--foreground-dim)]">{brandEmployees.length} people</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{rate}%</p>
                  <p className="text-xs text-[var(--foreground-dim)]">attendance rate</p>
                </div>
                <p className="text-sm text-[var(--foreground-dim)]">{present}/{total}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${rate}%`, backgroundColor: brand.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--foreground-dim)] p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
        <span className="text-[var(--foreground-dim)] uppercase tracking-wider text-[10px] font-medium">Legend:</span>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={clsx("w-3 h-3 rounded-full", statusDot(key as AttendanceStatus))} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[var(--surface-elevated)]" /><span>Weekend/No data</span></div>
      </div>
    </div>
  );
}
