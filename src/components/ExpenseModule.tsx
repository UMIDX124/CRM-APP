"use client";

import { useState, useMemo } from "react";
import { Receipt, Plus, Search, CheckCircle2, Clock, XCircle, DollarSign, X, Save, TrendingUp, Download } from "lucide-react";
import { clsx } from "clsx";
import { employees, brands } from "@/data/mock-data";

type ExpenseStatus = "APPROVED" | "PENDING" | "REJECTED";
type ExpenseCategory = "TRAVEL" | "MEALS" | "SOFTWARE" | "HARDWARE" | "OFFICE" | "MARKETING" | "OTHER";

interface Expense {
  id: string;
  employeeId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  receipt?: string;
  status: ExpenseStatus;
  approvedBy?: string;
}

const catLabels: Record<ExpenseCategory, { label: string; color: string }> = {
  TRAVEL: { label: "Travel", color: "#3B82F6" },
  MEALS: { label: "Meals", color: "#F59E0B" },
  SOFTWARE: { label: "Software", color: "#F59E0B" },
  HARDWARE: { label: "Hardware", color: "#06B6D4" },
  OFFICE: { label: "Office", color: "#10B981" },
  MARKETING: { label: "Marketing", color: "#FF6B00" },
  OTHER: { label: "Other", color: "#71717A" },
};

const statusCfg: Record<ExpenseStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
};

const sampleExpenses: Expense[] = [
  { id: "ex1", employeeId: "3", category: "SOFTWARE", amount: 299, description: "Ahrefs SEO subscription - Annual", date: "2026-04-01", status: "APPROVED", approvedBy: "Faizan" },
  { id: "ex2", employeeId: "7", category: "HARDWARE", amount: 1200, description: "MacBook Pro charger + dock station", date: "2026-03-28", status: "APPROVED", approvedBy: "Umer" },
  { id: "ex3", employeeId: "5", category: "TRAVEL", amount: 450, description: "Client meeting in Lahore - flight + hotel", date: "2026-03-25", status: "PENDING" },
  { id: "ex4", employeeId: "1", category: "MARKETING", amount: 5000, description: "Conference sponsorship - Digital Summit 2026", date: "2026-04-02", status: "PENDING" },
  { id: "ex5", employeeId: "8", category: "SOFTWARE", amount: 49, description: "GitHub Copilot subscription", date: "2026-04-01", status: "APPROVED", approvedBy: "Umer" },
  { id: "ex6", employeeId: "6", category: "MEALS", amount: 85, description: "Team lunch - content planning session", date: "2026-03-30", status: "APPROVED", approvedBy: "Ali Hassan" },
  { id: "ex7", employeeId: "10", category: "SOFTWARE", amount: 199, description: "Figma Pro license renewal", date: "2026-03-29", status: "REJECTED" },
  { id: "ex8", employeeId: "4", category: "OFFICE", amount: 350, description: "Standing desk + ergonomic chair", date: "2026-03-20", status: "APPROVED", approvedBy: "Faizan" },
];

export default function ExpenseModule() {
  const [expenses, setExpenses] = useState(sampleExpenses);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: "", category: "OTHER" as ExpenseCategory, amount: 0, description: "", date: "" });

  const filtered = useMemo(() => {
    return expenses.map((e) => ({ ...e, employee: employees.find((emp) => emp.id === e.employeeId) }))
      .filter((e) => {
        if (search && !(e.employee?.name || "").toLowerCase().includes(search.toLowerCase()) && !(e.description || "").toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
        return true;
      }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, filterStatus]);

  const stats = useMemo(() => ({
    total: expenses.reduce((a, e) => a + e.amount, 0),
    approved: expenses.filter((e) => e.status === "APPROVED").reduce((a, e) => a + e.amount, 0),
    pending: expenses.filter((e) => e.status === "PENDING").reduce((a, e) => a + e.amount, 0),
    count: expenses.length,
  }), [expenses]);

  const handleApprove = (id: string) => setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "APPROVED" as ExpenseStatus, approvedBy: "Admin" } : e));
  const handleReject = (id: string) => setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "REJECTED" as ExpenseStatus } : e));

  const handleSubmit = () => {
    if (!form.employeeId || !form.amount || !form.description) return;
    setExpenses((prev) => [...prev, { ...form, id: `ex${Date.now()}`, status: "PENDING" as ExpenseStatus, date: form.date || new Date().toISOString().split("T")[0] }]);
    setShowModal(false);
    setForm({ employeeId: "", category: "OTHER", amount: 0, description: "", date: "" });
  };

  return (
    <div className="page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Expenses", value: `$${stats.total.toLocaleString()}`, icon: DollarSign, color: "#FF6B00" },
          { label: "Approved", value: `$${stats.approved.toLocaleString()}`, icon: CheckCircle2, color: "#10B981" },
          { label: "Pending", value: `$${stats.pending.toLocaleString()}`, icon: Clock, color: "#F59E0B" },
          { label: "Total Claims", value: stats.count, icon: Receipt, color: "#3B82F6" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2"><s.icon className="w-4 h-4" style={{ color: s.color }} /><span className="text-xs text-[var(--foreground-dim)]">{s.label}</span></div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
          <input type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ExpenseStatus | "ALL")}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground-muted)] cursor-pointer">
          <option value="ALL" className="bg-[var(--surface)]">All Status</option>
          {Object.entries(statusCfg).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.label}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm">
          <Plus className="w-4 h-4" /> Submit Expense
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((exp) => {
          const cfg = statusCfg[exp.status];
          const cat = catLabels[exp.category];
          const Icon = cfg.icon;
          return (
            <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "15" }}>
                  <Receipt className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--foreground)]">{exp.description}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: cat.color, backgroundColor: cat.color + "15" }}>{cat.label}</span>
                  </div>
                  <p className="text-xs text-[var(--foreground-dim)] mt-0.5">{exp.employee?.name} &bull; {exp.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-[var(--foreground)] font-mono">${exp.amount.toLocaleString()}</p>
                <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                  <Icon className={clsx("w-3.5 h-3.5", cfg.color)} /><span className={cfg.color}>{cfg.label}</span>
                </div>
                {exp.status === "PENDING" && (
                  <div className="flex gap-1">
                    <button onClick={() => handleApprove(exp.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => handleReject(exp.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Submit Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)]"><X className="w-5 h-5" /></button>
            </div>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
              <option value="" className="bg-[var(--surface)]">Select employee...</option>
              {employees.map((e) => <option key={e.id} value={e.id} className="bg-[var(--surface)]">{e.name}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
              {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.label}</option>)}
            </select>
            <input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Amount ($)"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.employeeId || !form.amount}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-30">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
