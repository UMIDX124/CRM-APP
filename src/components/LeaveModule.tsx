"use client";

import { useState, useMemo } from "react";
import {
  CalendarOff, Plus, Search, CheckCircle2, XCircle, Clock, User, Calendar,
  X, Save, AlertTriangle, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { employees, brands } from "@/data/mock-data";

type LeaveType = "ANNUAL" | "SICK" | "CASUAL" | "MATERNITY" | "UNPAID";
type LeaveStatus = "APPROVED" | "PENDING" | "REJECTED";

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approvedBy?: string;
}

const leaveTypeLabels: Record<LeaveType, { label: string; color: string }> = {
  ANNUAL: { label: "Annual", color: "#3B82F6" },
  SICK: { label: "Sick", color: "#EF4444" },
  CASUAL: { label: "Casual", color: "#F59E0B" },
  MATERNITY: { label: "Maternity", color: "#F59E0B" },
  UNPAID: { label: "Unpaid", color: "#71717A" },
};

const statusCfg: Record<LeaveStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
};

const sampleLeaves: LeaveRequest[] = [
  { id: "lv1", employeeId: "5", type: "SICK", startDate: "2026-04-03", endDate: "2026-04-04", days: 2, reason: "Fever and flu", status: "APPROVED", appliedOn: "2026-04-02", approvedBy: "Ali Hassan" },
  { id: "lv2", employeeId: "9", type: "ANNUAL", startDate: "2026-04-10", endDate: "2026-04-14", days: 5, reason: "Family vacation", status: "PENDING", appliedOn: "2026-04-01" },
  { id: "lv3", employeeId: "6", type: "CASUAL", startDate: "2026-04-07", endDate: "2026-04-07", days: 1, reason: "Personal work", status: "PENDING", appliedOn: "2026-04-02" },
  { id: "lv4", employeeId: "8", type: "ANNUAL", startDate: "2026-03-20", endDate: "2026-03-24", days: 5, reason: "Holiday trip", status: "APPROVED", appliedOn: "2026-03-15", approvedBy: "Umer" },
  { id: "lv5", employeeId: "11", type: "SICK", startDate: "2026-03-28", endDate: "2026-03-28", days: 1, reason: "Migraine", status: "APPROVED", appliedOn: "2026-03-28", approvedBy: "Faizan" },
  { id: "lv6", employeeId: "10", type: "CASUAL", startDate: "2026-04-15", endDate: "2026-04-15", days: 1, reason: "Doctor appointment", status: "REJECTED", appliedOn: "2026-04-01" },
];

export default function LeaveModule() {
  const [leaves, setLeaves] = useState(sampleLeaves);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: "", type: "ANNUAL" as LeaveType, startDate: "", endDate: "", reason: "" });

  const filtered = useMemo(() => {
    return leaves.map((l) => ({ ...l, employee: employees.find((e) => e.id === l.employeeId) }))
      .filter((l) => {
        if (search && !l.employee?.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
  }, [leaves, search, filterStatus]);

  const stats = useMemo(() => ({
    pending: leaves.filter((l) => l.status === "PENDING").length,
    approved: leaves.filter((l) => l.status === "APPROVED").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
    totalDays: leaves.filter((l) => l.status === "APPROVED").reduce((a, l) => a + l.days, 0),
  }), [leaves]);

  const handleApprove = (id: string) => {
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: "APPROVED" as LeaveStatus, approvedBy: "Admin" } : l));
  };

  const handleReject = (id: string) => {
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: "REJECTED" as LeaveStatus } : l));
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.startDate || !form.endDate) return;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    setLeaves((prev) => [...prev, {
      id: `lv${Date.now()}`, ...form, days, status: "PENDING" as LeaveStatus, appliedOn: new Date().toISOString().split("T")[0],
    }]);
    setShowModal(false);
    setForm({ employeeId: "", type: "ANNUAL", startDate: "", endDate: "", reason: "" });
  };

  return (
    <div className="page-container relative">
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm rounded-xl">
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--foreground)]">Coming Soon</p>
          <p className="text-sm text-[var(--foreground-dim)] mt-1">Leave management is under development</p>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pending Requests", value: stats.pending, icon: Clock, color: "#F59E0B" },
          { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "#10B981" },
          { label: "Rejected", value: stats.rejected, icon: XCircle, color: "#EF4444" },
          { label: "Total Leave Days", value: stats.totalDays, icon: Calendar, color: "#3B82F6" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-[var(--foreground-dim)]">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeaveStatus | "ALL")}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground-muted)] cursor-pointer">
          <option value="ALL" className="bg-[var(--surface)]">All Status</option>
          {Object.entries(statusCfg).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.label}</option>)}
        </select>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Leave List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <CalendarOff className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-[var(--foreground-dim)] text-sm">No leave requests found</p>
          </div>
        ) : filtered.map((leave) => {
          const cfg = statusCfg[leave.status];
          const typeCfg = leaveTypeLabels[leave.type];
          const StatusIcon = cfg.icon;
          return (
            <div key={leave.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-white/[0.1] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[var(--foreground-muted)]">{leave.employee?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[var(--foreground)]">{leave.employee?.name}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: typeCfg.color, backgroundColor: typeCfg.color + "15" }}>{typeCfg.label}</span>
                    </div>
                    <p className="text-xs text-[var(--foreground-dim)] mt-0.5">{leave.startDate} to {leave.endDate} &bull; {leave.days} day{leave.days > 1 ? "s" : ""}</p>
                    {leave.reason && <p className="text-xs text-[var(--foreground-dim)] mt-1">{leave.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                    <StatusIcon className={clsx("w-3.5 h-3.5", cfg.color)} />
                    <span className={cfg.color}>{cfg.label}</span>
                  </div>
                  {leave.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(leave.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="Approve">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReject(leave.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Reject">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Apply for Leave</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Employee</label>
                <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
                  <option value="" className="bg-[var(--surface)]">Select employee...</option>
                  {employees.map((e) => <option key={e.id} value={e.id} className="bg-[var(--surface)]">{e.name} — {e.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Leave Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
                  {Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">From</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">To</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Reason</label>
                <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why do you need leave?" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.employeeId || !form.startDate || !form.endDate}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-30">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
