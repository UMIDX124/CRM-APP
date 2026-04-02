"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Download, FileText, DollarSign, Clock, CheckCircle2,
  AlertCircle, XCircle, Eye, Trash2, Send, Calendar, Building2, MoreVertical,
} from "lucide-react";
import { clsx } from "clsx";
import { clients, brands } from "@/data/mock-data";

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE" | "DRAFT" | "CANCELLED";

interface InvoiceItem { description: string; quantity: number; rate: number; }

interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  brand: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
}

const statusConfig: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  OVERDUE: { label: "Overdue", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: AlertCircle },
  DRAFT: { label: "Draft", color: "text-white/40", bg: "bg-white/5 border-white/10", icon: FileText },
  CANCELLED: { label: "Cancelled", color: "text-white/30", bg: "bg-white/5 border-white/10", icon: XCircle },
};

const sampleInvoices: Invoice[] = [
  { id: "1", number: "INV-2026-001", clientId: "5", clientName: "SecureBank", brand: "BSL", items: [{ description: "Cybersecurity Audit Q1", quantity: 1, rate: 25000 }], subtotal: 25000, tax: 0, total: 25000, status: "PAID", issueDate: "2026-03-01", dueDate: "2026-03-15", paidDate: "2026-03-12" },
  { id: "2", number: "INV-2026-002", clientId: "7", clientName: "DTC E-Commerce Brand", brand: "DPL", items: [{ description: "Meta Ads Management - March", quantity: 1, rate: 22000 }, { description: "Google Ads Setup", quantity: 1, rate: 5000 }], subtotal: 27000, tax: 0, total: 27000, status: "PAID", issueDate: "2026-03-01", dueDate: "2026-03-15", paidDate: "2026-03-14" },
  { id: "3", number: "INV-2026-003", clientId: "4", clientName: "TechMart", brand: "BSL", items: [{ description: "E-Commerce Platform Maintenance", quantity: 1, rate: 15000 }], subtotal: 15000, tax: 0, total: 15000, status: "PENDING", issueDate: "2026-03-15", dueDate: "2026-04-05" },
  { id: "4", number: "INV-2026-004", clientId: "8", clientName: "B2B SaaS Company", brand: "DPL", items: [{ description: "Attribution Setup", quantity: 1, rate: 18000 }, { description: "CRM Integration", quantity: 1, rate: 10000 }], subtotal: 28000, tax: 0, total: 28000, status: "PENDING", issueDate: "2026-03-20", dueDate: "2026-04-10" },
  { id: "5", number: "INV-2026-005", clientId: "1", clientName: "Sarah Mitchell E-Commerce", brand: "VCS", items: [{ description: "AI CX Platform - March", quantity: 1, rate: 8500 }], subtotal: 8500, tax: 0, total: 8500, status: "OVERDUE", issueDate: "2026-02-28", dueDate: "2026-03-15" },
  { id: "6", number: "INV-2026-006", clientId: "6", clientName: "DataFlow Analytics", brand: "BSL", items: [{ description: "AI Dashboard Development", quantity: 1, rate: 18000 }], subtotal: 18000, tax: 0, total: 18000, status: "PAID", issueDate: "2026-03-10", dueDate: "2026-03-25", paidDate: "2026-03-22" },
  { id: "7", number: "INV-2026-007", clientId: "2", clientName: "SaaS Startup Client", brand: "VCS", items: [{ description: "Web Development Sprint", quantity: 1, rate: 12000 }], subtotal: 12000, tax: 0, total: 12000, status: "DRAFT", issueDate: "2026-04-01", dueDate: "2026-04-15" },
  { id: "8", number: "INV-2026-008", clientId: "3", clientName: "Marketing Agency Partner", brand: "VCS", items: [{ description: "SEO + PPC Package - April", quantity: 1, rate: 5800 }], subtotal: 5800, tax: 0, total: 5800, status: "PENDING", issueDate: "2026-04-01", dueDate: "2026-04-15" },
];

export default function InvoiceModule() {
  const [invoices] = useState(sampleInvoices);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase()) && !inv.number.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "ALL" && inv.status !== filterStatus) return false;
      return true;
    });
  }, [invoices, search, filterStatus]);

  const stats = useMemo(() => ({
    totalRevenue: invoices.filter((i) => i.status === "PAID").reduce((a, i) => a + i.total, 0),
    pending: invoices.filter((i) => i.status === "PENDING").reduce((a, i) => a + i.total, 0),
    overdue: invoices.filter((i) => i.status === "OVERDUE").reduce((a, i) => a + i.total, 0),
    count: invoices.length,
  }), [invoices]);

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#D4AF37";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Collected", value: `$${stats.totalRevenue.toLocaleString()}`, icon: CheckCircle2, color: "emerald" },
          { label: "Pending", value: `$${stats.pending.toLocaleString()}`, icon: Clock, color: "amber" },
          { label: "Overdue", value: `$${stats.overdue.toLocaleString()}`, icon: AlertCircle, color: "red" },
          { label: "Total Invoices", value: stats.count, icon: FileText, color: "cyan" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color === "emerald" ? "#10B981" : stat.color === "amber" ? "#F59E0B" : stat.color === "red" ? "#EF4444" : "#0EA5E9" }} />
              <span className="text-xs text-white/50">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | "ALL")}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k} className="bg-[#0f0f1e]">{v.label}</option>)}
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#D4AF37]/20 transition-all">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Due Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const cfg = statusConfig[inv.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">{inv.number}</p>
                        <p className="text-xs text-white/40">{inv.issueDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: brandColor(inv.brand), backgroundColor: brandColor(inv.brand) + "10" }}>{inv.brand}</span>
                      <span className="text-sm text-white/70">{inv.clientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-white">${inv.total.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", cfg.bg)}>
                      <StatusIcon className={clsx("w-3.5 h-3.5", cfg.color)} />
                      <span className={cfg.color}>{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-sm", inv.status === "OVERDUE" ? "text-red-400" : "text-white/50")}>{inv.dueDate}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><Download className="w-4 h-4" /></button>
                      {inv.status === "DRAFT" && <button className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-white/40 hover:text-cyan-400 transition-all"><Send className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)} />
          <div className="relative w-full max-w-lg bg-[#0f0f1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white font-mono">{selectedInvoice.number}</p>
                  <p className="text-sm text-white/40">{selectedInvoice.clientName}</p>
                </div>
                <div className={clsx("px-3 py-1.5 rounded-lg border text-xs font-medium", statusConfig[selectedInvoice.status].bg)}>
                  <span className={statusConfig[selectedInvoice.status].color}>{statusConfig[selectedInvoice.status].label}</span>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-white/40 mb-1">Issue Date</p><p className="text-white">{selectedInvoice.issueDate}</p></div>
                <div><p className="text-xs text-white/40 mb-1">Due Date</p><p className="text-white">{selectedInvoice.dueDate}</p></div>
              </div>
              <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/[0.03]"><th className="text-left px-4 py-2 text-xs text-white/40">Item</th><th className="text-right px-4 py-2 text-xs text-white/40">Amount</th></tr></thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-4 py-2.5 text-white/70">{item.description}</td>
                        <td className="px-4 py-2.5 text-white font-medium text-right">${item.rate.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
                <span className="text-sm text-white/50">Total</span>
                <span className="text-xl font-bold text-white">${selectedInvoice.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Close</button>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-semibold text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
