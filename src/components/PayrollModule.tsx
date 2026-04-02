"use client";

import { useState, useMemo } from "react";
import { DollarSign, Download, Search, Calendar, Users, TrendingUp, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { employees, brands } from "@/data/mock-data";

type PayrollStatus = "PAID" | "PENDING" | "PROCESSING";

interface PayrollRecord {
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: PayrollStatus;
  paidDate?: string;
}

// Generate payroll for current month
const generatePayroll = (): PayrollRecord[] => {
  return employees.filter(e => e.salary > 0).map((emp) => {
    const base = emp.salary;
    const bonus = Math.random() > 0.7 ? Math.round(base * 0.1) : 0;
    const deductions = Math.round(base * 0.02);
    const tax = Math.round(base * 0.05);
    const net = base + bonus - deductions - tax;
    const statuses: PayrollStatus[] = ["PAID", "PAID", "PAID", "PENDING", "PROCESSING"];
    return {
      employeeId: emp.id,
      month: "2026-04",
      baseSalary: base,
      bonus,
      deductions,
      tax,
      netPay: net,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paidDate: statuses[0] === "PAID" ? "2026-04-01" : undefined,
    };
  });
};

const statusCfg: Record<PayrollStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  PROCESSING: { label: "Processing", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: AlertCircle },
};

export default function PayrollModule() {
  const [payroll] = useState(generatePayroll);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("2026-04");

  const filtered = useMemo(() => {
    return payroll.map((p) => ({ ...p, employee: employees.find((e) => e.id === p.employeeId)! }))
      .filter((p) => {
        if (!p.employee) return false;
        if (search && !p.employee.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterBrand !== "ALL" && p.employee.brand !== filterBrand) return false;
        return true;
      });
  }, [payroll, search, filterBrand]);

  const stats = useMemo(() => ({
    totalPayroll: filtered.reduce((a, p) => a + p.netPay, 0),
    totalBonus: filtered.reduce((a, p) => a + p.bonus, 0),
    totalTax: filtered.reduce((a, p) => a + p.tax, 0),
    paid: filtered.filter((p) => p.status === "PAID").length,
    pending: filtered.filter((p) => p.status !== "PAID").length,
  }), [filtered]);

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Payroll", value: `$${stats.totalPayroll.toLocaleString()}`, icon: DollarSign, color: "#FF6B00" },
          { label: "Total Bonus", value: `$${stats.totalBonus.toLocaleString()}`, icon: TrendingUp, color: "#10B981" },
          { label: "Total Tax", value: `$${stats.totalTax.toLocaleString()}`, icon: FileText, color: "#EF4444" },
          { label: "Paid", value: stats.paid, icon: CheckCircle2, color: "#10B981" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "#F59E0B" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-white/50">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#111114]">All Companies</option>
          {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#111114]">{b.code}</option>)}
        </select>
        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:text-white transition-all">
          <Download className="w-4 h-4" /> Export Payslips
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Base</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Bonus</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Deductions</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Tax</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Net Pay</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const cfg = statusCfg[p.status];
              const Icon = cfg.icon;
              return (
                <tr key={p.employeeId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-white/80">{p.employee.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.employee.name}</p>
                        <p className="text-xs text-white/40">{p.employee.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: brandColor(p.employee.brand), backgroundColor: brandColor(p.employee.brand) + "10" }}>{p.employee.brand}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-white/70 font-mono">${p.baseSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-400 font-mono">{p.bonus > 0 ? `+$${p.bonus}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-red-400 font-mono">-${p.deductions}</td>
                  <td className="px-4 py-3 text-right text-sm text-amber-400 font-mono">-${p.tax}</td>
                  <td className="px-4 py-3 text-right text-sm text-white font-bold font-mono">${p.netPay.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                      <Icon className={clsx("w-3.5 h-3.5", cfg.color)} />
                      <span className={cfg.color}>{cfg.label}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
