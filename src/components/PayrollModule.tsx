"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign, Plus, Loader2, CheckCircle2, Clock, X, Download,
  PlayCircle, AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { apiMutate } from "@/lib/api";
import { formatCurrency } from "@/lib/types";

type PayrollStatus = "PENDING" | "PAID";

interface PayrollRow {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  currency: string;
  status: PayrollStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string | null;
    avatar: string | null;
    title: string | null;
  };
}

interface Me {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isManagerRole(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "PROJECT_MANAGER" || role === "DEPT_HEAD";
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PayrollModule() {
  const { success, error: showError } = useToast();

  const now = new Date();
  const [me, setMe] = useState<Me | null>(null);
  const [records, setRecords] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [processing, setProcessing] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<
    Array<{ id: string; firstName: string; lastName: string; salary: number | null; currency: string }>
  >([]);
  const [form, setForm] = useState({
    employeeId: "",
    baseSalary: 0,
    bonus: 0,
    deductions: 0,
    notes: "",
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [meRes, recRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch(`/api/payroll?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" }),
      ]);
      if (!meRes.ok) throw new Error(`Session ${meRes.status}`);
      if (!recRes.ok) throw new Error(`Payroll ${recRes.status}`);
      const meData: Me = await meRes.json();
      const recData = await recRes.json();
      setMe(meData);
      setRecords(Array.isArray(recData) ? recData : []);
    } catch (err) {
      console.error("[payroll] load error:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Fetch employees for the "Add Record" form
  useEffect(() => {
    if (!showAddForm) return;
    fetch("/api/employees", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(
            data.map((e: Record<string, unknown>) => ({
              id: String(e.id),
              firstName: String(e.firstName || ""),
              lastName: String(e.lastName || ""),
              salary: typeof e.salary === "number" ? e.salary : null,
              currency: String(e.currency || "USD"),
            }))
          );
        }
      })
      .catch((err) => console.error("[payroll] employees fetch:", err));
  }, [showAddForm]);

  // Close modal on Escape
  useEffect(() => {
    if (!showAddForm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowAddForm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddForm]);

  const isMgr = me ? isManagerRole(me.role) : false;

  const stats = useMemo(() => {
    const total = records.reduce((sum, r) => sum + r.netPay, 0);
    const paid = records.filter((r) => r.status === "PAID").reduce((sum, r) => sum + r.netPay, 0);
    const pending = records.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.netPay, 0);
    return { total, paid, pending, count: records.length };
  }, [records]);

  const handleMarkPaid = async (id: string) => {
    const result = await apiMutate(`/api/payroll/${id}`, "PATCH", { status: "PAID" });
    if (!result.ok) {
      showError(result.error || "Failed to mark paid");
      return;
    }
    success("Marked as paid");
    await loadRecords();
  };

  const handleBulkProcess = async () => {
    if (!confirm(`Bulk-create payroll records for ${MONTHS[selectedMonth - 1]} ${selectedYear}?`)) return;
    setProcessing(true);
    const result = await apiMutate<{ created: number; skipped: number; total: number }>(
      "/api/payroll",
      "POST",
      { bulk: true, month: selectedMonth, year: selectedYear }
    );
    setProcessing(false);
    if (!result.ok) {
      showError(result.error || "Bulk process failed");
      return;
    }
    success(
      `Created ${result.data?.created ?? 0} record(s), skipped ${result.data?.skipped ?? 0}`
    );
    await loadRecords();
  };

  const handleAddRecord = async () => {
    if (!form.employeeId) {
      showError("Select an employee");
      return;
    }
    if (form.baseSalary <= 0) {
      showError("Enter a base salary");
      return;
    }
    setSubmitting(true);
    const result = await apiMutate("/api/payroll", "POST", {
      employeeId: form.employeeId,
      month: selectedMonth,
      year: selectedYear,
      baseSalary: Number(form.baseSalary),
      bonus: Number(form.bonus) || 0,
      deductions: Number(form.deductions) || 0,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      showError(result.error || "Failed to create record");
      return;
    }
    success("Payroll record created");
    setShowAddForm(false);
    setForm({ employeeId: "", baseSalary: 0, bonus: 0, deductions: 0, notes: "" });
    await loadRecords();
  };

  const exportCsv = () => {
    const headers = ["Employee", "Department", "Month", "Year", "Base Salary", "Bonus", "Deductions", "Net Pay", "Currency", "Status", "Paid At"];
    const rows = records.map((r) => [
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.department || "",
      MONTHS[r.month - 1],
      r.year,
      r.baseSalary,
      r.bonus,
      r.deductions,
      r.netPay,
      r.currency,
      r.status,
      r.paidAt ? new Date(r.paidAt).toISOString() : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Payroll" value={formatCurrency(stats.total, true)} color="#F59E0B" />
        <StatCard icon={CheckCircle2} label="Paid" value={formatCurrency(stats.paid, true)} color="#10B981" />
        <StatCard icon={Clock} label="Pending" value={formatCurrency(stats.pending, true)} color="#F59E0B" />
        <StatCard icon={DollarSign} label="Records" value={String(stats.count)} color="#3B82F6" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="input-field w-auto"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="input-field w-auto"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        {isMgr && (
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-secondary" disabled={records.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={handleBulkProcess} disabled={processing} className="btn-secondary">
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Bulk Process
            </button>
            <button onClick={() => setShowAddForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : loadError ? (
        <div className="card p-6 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto mb-2" />
          <p className="text-[13px] text-[var(--foreground)]">{loadError}</p>
          <button onClick={loadRecords} className="btn-secondary mt-3">Retry</button>
        </div>
      ) : records.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <DollarSign className="w-10 h-10 text-[var(--foreground-dim)] opacity-40 mb-3" />
          <p className="text-[13px] text-[var(--foreground-dim)] mb-3">
            No payroll records for {MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
          {isMgr && (
            <button onClick={handleBulkProcess} disabled={processing} className="btn-secondary">
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Bulk Process {MONTHS[selectedMonth - 1]}
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Bonus</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net Pay</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <p className="text-[13px] font-medium text-[var(--foreground)]">
                        {r.employee.firstName} {r.employee.lastName}
                      </p>
                      <p className="text-[11px] text-[var(--foreground-dim)]">
                        {r.employee.title || r.employee.department || r.employee.email}
                      </p>
                    </td>
                    <td className="text-right tabular-nums text-[13px] text-[var(--foreground)]">
                      {formatCurrency(r.baseSalary)}
                    </td>
                    <td className="text-right tabular-nums text-[12px] text-emerald-400">
                      {r.bonus > 0 ? `+${formatCurrency(r.bonus)}` : "—"}
                    </td>
                    <td className="text-right tabular-nums text-[12px] text-red-400">
                      {r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : "—"}
                    </td>
                    <td className="text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
                      {formatCurrency(r.netPay)}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="text-right">
                      {isMgr && r.status === "PENDING" && (
                        <button
                          onClick={() => handleMarkPaid(r.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        >
                          Mark Paid
                        </button>
                      )}
                      {r.status === "PAID" && r.paidAt && (
                        <span className="text-[11px] text-[var(--foreground-dim)]">
                          {new Date(r.paidAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add record modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div
            className="modal-content w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Add Payroll Record
              </h2>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    setForm({
                      ...form,
                      employeeId: e.target.value,
                      baseSalary: emp?.salary || 0,
                    });
                  }}
                  className="input-field"
                >
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                      {e.salary ? ` — ${formatCurrency(e.salary)} base` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="input-field"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="input-field"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Base Salary</label>
                <input
                  type="number"
                  value={form.baseSalary || ""}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                  className="input-field"
                  min={0}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Bonus</label>
                  <input
                    type="number"
                    value={form.bonus || ""}
                    onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })}
                    className="input-field"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Deductions</label>
                  <input
                    type="number"
                    value={form.deductions || ""}
                    onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })}
                    className="input-field"
                    min={0}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Net Pay:{" "}
                  <strong className="text-[var(--foreground)]">
                    {formatCurrency(Number(form.baseSalary) + Number(form.bonus) - Number(form.deductions))}
                  </strong>
                </p>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">
                  Notes <span className="text-[var(--foreground-dim)]">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddRecord} disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
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
  value: string;
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

function StatusBadge({ status }: { status: PayrollStatus }) {
  const styles = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  } as const;
  return <span className={`badge ${styles[status]}`}>{status}</span>;
}
