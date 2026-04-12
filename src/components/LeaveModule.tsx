"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarOff, Plus, Loader2, CheckCircle2, XCircle, Clock, X, Calendar, Users,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { apiMutate } from "@/lib/api";

type LeaveType = "ANNUAL" | "SICK" | "CASUAL" | "UNPAID";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRow {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
    department: string | null;
  };
  approver: { id: string; firstName: string; lastName: string } | null;
}

interface LeaveBalance {
  year: number;
  ANNUAL: { allocated: number; used: number; remaining: number };
  SICK: { allocated: number; used: number; remaining: number };
  CASUAL: { allocated: number; used: number; remaining: number };
  UNPAID: { used: number };
}

interface Me {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "ANNUAL", label: "Annual" },
  { value: "SICK", label: "Sick" },
  { value: "CASUAL", label: "Casual" },
  { value: "UNPAID", label: "Unpaid" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isManagerRole(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "PROJECT_MANAGER" || role === "DEPT_HEAD";
}

export default function LeaveModule() {
  const { success, error: showError } = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"ALL" | LeaveStatus>("ALL");
  const [form, setForm] = useState({
    type: "ANNUAL" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [meRes, leavesRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/leaves", { cache: "no-store" }),
      ]);
      if (!meRes.ok) throw new Error(`Session ${meRes.status}`);
      if (!leavesRes.ok) throw new Error(`Leaves ${leavesRes.status}`);
      const meData: Me = await meRes.json();
      const leavesData = await leavesRes.json();
      setMe(meData);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);

      // Balance for self
      if (meData?.id) {
        const balRes = await fetch(`/api/leaves/balance/${meData.id}`, { cache: "no-store" });
        if (balRes.ok) setBalance(await balRes.json());
      }
    } catch (err) {
      console.error("[leaves] load error:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Close modal on Escape
  useEffect(() => {
    if (!showForm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowForm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const isMgr = me ? isManagerRole(me.role) : false;

  const visibleLeaves = useMemo(() => {
    return leaves.filter((l) => filter === "ALL" || l.status === filter);
  }, [leaves, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      pending: leaves.filter((l) => l.status === "PENDING").length,
      approvedThisMonth: leaves.filter((l) => {
        if (l.status !== "APPROVED") return false;
        const d = new Date(l.approvedAt || l.createdAt);
        return d >= monthStart;
      }).length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
      onLeaveToday: leaves.filter((l) => {
        if (l.status !== "APPROVED") return false;
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        return now >= s && now <= e;
      }).length,
    };
  }, [leaves]);

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) {
      showError("Pick a start and end date");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showError("End date must be on or after start date");
      return;
    }
    setSubmitting(true);
    const result = await apiMutate("/api/leaves", "POST", {
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      showError(result.error || "Failed to submit leave");
      return;
    }
    success("Leave request submitted");
    setShowForm(false);
    setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
    await loadAll();
  };

  const handleDecision = async (id: string, status: "APPROVED" | "REJECTED") => {
    const result = await apiMutate(`/api/leaves/${id}`, "PATCH", { status });
    if (!result.ok) {
      showError(result.error || "Failed to update leave");
      return;
    }
    success(`Leave ${status.toLowerCase()}`);
    await loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return;
    const result = await apiMutate(`/api/leaves/${id}`, "DELETE");
    if (!result.ok) {
      showError(result.error || "Failed to cancel leave");
      return;
    }
    success("Leave cancelled");
    await loadAll();
  };

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="#F59E0B" />
        <StatCard icon={CheckCircle2} label="Approved This Month" value={stats.approvedThisMonth} color="#10B981" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="#EF4444" />
        <StatCard icon={Users} label="On Leave Today" value={stats.onLeaveToday} color="#3B82F6" />
      </div>

      {/* Balance card (self) */}
      {balance && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Your Balance</h3>
              <p className="text-[11px] text-[var(--foreground-dim)]">Year {balance.year}</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Apply Leave
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["ANNUAL", "SICK", "CASUAL"] as const).map((t) => {
              const b = balance[t];
              const pct = b.allocated > 0 ? Math.round((b.used / b.allocated) * 100) : 0;
              return (
                <div key={t} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-dim)]">{t}</p>
                  <p className="text-[18px] font-semibold text-[var(--foreground)] tabular-nums">
                    {b.remaining}
                    <span className="text-[11px] text-[var(--foreground-dim)] font-normal"> / {b.allocated} days</span>
                  </p>
                  <div className="progress-bar mt-2">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct < 60 ? "#10B981" : pct < 90 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-dim)]">UNPAID</p>
              <p className="text-[18px] font-semibold text-[var(--foreground)] tabular-nums">
                {balance.UNPAID.used}
                <span className="text-[11px] text-[var(--foreground-dim)] font-normal"> used</span>
              </p>
              <div className="h-1.5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              filter === s
                ? "bg-[var(--primary)] text-black"
                : "bg-[var(--surface)] text-[var(--foreground-dim)] border border-[var(--border)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : loadError ? (
        <div className="card p-6 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto mb-2" />
          <p className="text-[13px] text-[var(--foreground)]">{loadError}</p>
          <button onClick={loadAll} className="btn-secondary mt-3">Retry</button>
        </div>
      ) : visibleLeaves.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <CalendarOff className="w-10 h-10 text-[var(--foreground-dim)] opacity-40 mb-3" />
          <p className="text-[13px] text-[var(--foreground-dim)] mb-3">No leave requests yet</p>
          <button onClick={() => setShowForm(true)} className="btn-secondary">
            <Plus className="w-3.5 h-3.5" /> Apply for Leave
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th className="text-right">Days</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeaves.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {l.employee.firstName} {l.employee.lastName}
                      </p>
                      <p className="text-[11px] text-[var(--foreground-dim)]">
                        {l.employee.department || l.employee.email}
                      </p>
                    </td>
                    <td>
                      <span className="badge bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">
                        {l.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-[var(--foreground-muted)]">
                      {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                    </td>
                    <td className="text-right tabular-nums text-[13px] text-[var(--foreground)]">
                      {l.days}
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isMgr && l.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleDecision(l.id, "APPROVED")}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(l.id, "REJECTED")}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {me?.id === l.employeeId && l.status === "PENDING" && (
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--surface)] text-[var(--foreground-dim)] border border-[var(--border)] hover:text-red-400"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="modal-content w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Apply for Leave</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                  className="input-field"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">
                  Reason <span className="text-[var(--foreground-dim)]">(optional)</span>
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  placeholder="Add any details…"
                  className="input-field resize-none"
                />
              </div>
              {form.type !== "UNPAID" && balance && (
                <div className="p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Remaining {form.type.toLowerCase()} balance:{" "}
                    <strong className="text-[var(--foreground)]">
                      {balance[form.type].remaining} day(s)
                    </strong>
                  </p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] text-[var(--foreground-dim)]">{label}</span>
      </div>
      <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  } as const;
  return (
    <span className={`badge ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
