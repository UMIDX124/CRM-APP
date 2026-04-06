"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, FileText, DollarSign, Clock, CheckCircle2,
  AlertCircle, XCircle, Eye, X, Save, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { apiMutate } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/components/CompanyContext";
import { formatCurrency } from "@/lib/types";

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE" | "DRAFT" | "CANCELLED";
interface InvoiceItem { description: string; quantity: number; rate: number; }
interface Invoice {
  id: string; number: string; clientId: string; clientName: string; brand: string;
  items: InvoiceItem[]; subtotal: number; tax: number; total: number;
  status: InvoiceStatus; issueDate: string; dueDate: string; paidDate?: string;
}

const statusCfg: Record<InvoiceStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", color: "#10B981", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "#F59E0B", icon: Clock },
  OVERDUE: { label: "Overdue", color: "#EF4444", icon: AlertCircle },
  DRAFT: { label: "Draft", color: "#71717A", icon: FileText },
  CANCELLED: { label: "Cancelled", color: "#52525B", icon: XCircle },
};

const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];

const sampleInvoices: Invoice[] = [
  { id: "1", number: "INV-2026-001", clientId: "5", clientName: "SecureBank", brand: "BSL", items: [{ description: "Cybersecurity Audit Q1", quantity: 1, rate: 25000 }], subtotal: 25000, tax: 0, total: 25000, status: "PAID", issueDate: "2026-03-01", dueDate: "2026-03-15", paidDate: "2026-03-12" },
  { id: "2", number: "INV-2026-002", clientId: "7", clientName: "DTC E-Commerce Brand", brand: "DPL", items: [{ description: "Meta Ads Management", quantity: 1, rate: 22000 }], subtotal: 22000, tax: 0, total: 22000, status: "PAID", issueDate: "2026-03-01", dueDate: "2026-03-15", paidDate: "2026-03-14" },
  { id: "3", number: "INV-2026-003", clientId: "4", clientName: "TechMart", brand: "BSL", items: [{ description: "Platform Maintenance", quantity: 1, rate: 15000 }], subtotal: 15000, tax: 0, total: 15000, status: "PENDING", issueDate: "2026-03-15", dueDate: "2026-04-05" },
  { id: "4", number: "INV-2026-004", clientId: "8", clientName: "B2B SaaS Company", brand: "DPL", items: [{ description: "Attribution Setup", quantity: 1, rate: 28000 }], subtotal: 28000, tax: 0, total: 28000, status: "PENDING", issueDate: "2026-03-20", dueDate: "2026-04-10" },
  { id: "5", number: "INV-2026-005", clientId: "1", clientName: "Sarah Mitchell E-Commerce", brand: "VCS", items: [{ description: "AI CX Platform", quantity: 1, rate: 8500 }], subtotal: 8500, tax: 0, total: 8500, status: "OVERDUE", issueDate: "2026-02-28", dueDate: "2026-03-15" },
  { id: "6", number: "INV-2026-006", clientId: "6", clientName: "DataFlow Analytics", brand: "BSL", items: [{ description: "AI Dashboard Dev", quantity: 1, rate: 18000 }], subtotal: 18000, tax: 0, total: 18000, status: "PAID", issueDate: "2026-03-10", dueDate: "2026-03-25", paidDate: "2026-03-22" },
];

const defaultForm = { clientName: "", brand: "VCS", items: [{ description: "", quantity: 1, rate: 0 }] as InvoiceItem[], dueDate: "", notes: "" };

export default function InvoiceModule() {
  const { success, error: showError } = useToast();
  const { activeCompany } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/invoices?brand=${activeCompany.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Invoice[] = data.map((inv: Record<string, unknown>) => ({
            id: String(inv.id), number: String(inv.number || ""),
            clientId: String(inv.clientId || ""),
            clientName: (inv.client as Record<string, string>)?.companyName || "",
            brand: (inv.brand as Record<string, string>)?.code || "",
            items: (inv.items as InvoiceItem[]) || [],
            subtotal: Number(inv.subtotal) || 0, tax: Number(inv.tax) || 0,
            total: Number(inv.total) || 0,
            status: String(inv.status || "PENDING") as InvoiceStatus,
            issueDate: inv.issueDate ? String(inv.issueDate).split("T")[0] : "",
            dueDate: inv.dueDate ? String(inv.dueDate).split("T")[0] : "",
            paidDate: inv.paidDate ? String(inv.paidDate).split("T")[0] : undefined,
          }));
          setInvoices(mapped);
        } else {
          setInvoices(sampleInvoices);
        }
      })
      .catch(() => { setInvoices(sampleInvoices); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompany.code]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => invoices.filter((inv) => {
    if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase()) && !inv.number.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "ALL" && inv.status !== filterStatus) return false;
    return true;
  }), [invoices, search, filterStatus]);

  const stats = useMemo(() => ({
    collected: invoices.filter((i) => i.status === "PAID").reduce((a, i) => a + i.total, 0),
    pending: invoices.filter((i) => i.status === "PENDING").reduce((a, i) => a + i.total, 0),
    overdue: invoices.filter((i) => i.status === "OVERDUE").reduce((a, i) => a + i.total, 0),
    count: invoices.length,
  }), [invoices]);

  const formTotal = form.items.reduce((a, item) => a + item.quantity * item.rate, 0);
  const addLineItem = () => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, rate: 0 }] });
  const removeLineItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: string | number) => { const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }; setForm({ ...form, items }); };

  const handleCreate = async () => {
    if (!form.clientName) { showError("Select a client"); return; }
    if (form.items.some((i) => !i.description || !i.rate)) { showError("Fill all line items"); return; }
    setSaving(true);
    const invNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;
    const newInv: Invoice = { id: String(Date.now()), number: invNum, clientId: "", clientName: form.clientName, brand: form.brand, items: form.items, subtotal: formTotal, tax: 0, total: formTotal, status: "PENDING", issueDate: new Date().toISOString().split("T")[0], dueDate: form.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0] };
    const result = await apiMutate("/api/invoices", "POST", newInv);
    if (!result.ok) { showError(result.error || "Failed to create invoice"); setSaving(false); return; }
    setInvoices((prev) => [...prev, newInv]);
    success(`Invoice ${invNum} created`);
    setSaving(false);
    setShowCreateModal(false);
    setForm(defaultForm);
  };

  const markPaid = async (id: string) => {
    const result = await apiMutate(`/api/invoices/${id}`, "PATCH", { status: "PAID", paidDate: new Date().toISOString().split("T")[0] });
    if (!result.ok) { showError(result.error || "Failed to mark as paid"); return; }
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "PAID" as InvoiceStatus, paidDate: new Date().toISOString().split("T")[0] } : i)));
    success("Marked as paid");
    setSelectedInvoice(null);
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Collected", value: formatCurrency(stats.collected, true), icon: CheckCircle2, color: "#10B981" },
          { label: "Pending", value: formatCurrency(stats.pending, true), icon: Clock, color: "#F59E0B" },
          { label: "Overdue", value: formatCurrency(stats.overdue, true), icon: AlertCircle, color: "#EF4444" },
          { label: "Invoices", value: String(stats.count), icon: FileText, color: "#FF6B00" },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <div className="flex items-center gap-2 mb-2"><s.icon className="w-3.5 h-3.5" style={{ color: s.color }} /><span className="text-[11px] text-[var(--foreground-dim)]">{s.label}</span></div>
            <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="search-box flex-1"><Search className="w-3.5 h-3.5" /><input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-8" /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | "ALL")} className="input-field w-auto min-w-[110px]">
          <option value="ALL">All Status</option>
          {Object.entries(statusCfg).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary whitespace-nowrap"><Plus className="w-4 h-4" /> New Invoice</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-glow overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
            {["w-16","w-24","w-20","w-16","w-14"].map((w,i) => <div key={i} className={`h-3 ${w} skeleton rounded`} />)}
          </div>
          {Array.from({ length: 5 }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="h-3 w-16 skeleton rounded" />
              <div className="flex-1 space-y-1.5"><div className="h-3.5 w-28 skeleton rounded" /><div className="h-2.5 w-20 skeleton rounded" /></div>
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-5 w-14 skeleton rounded-full" />
              <div className="h-3 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Client</th><th className="text-right">Amount</th><th className="text-center">Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((inv) => {
                const cfg = statusCfg[inv.status];
                return (
                  <tr key={inv.id}>
                    <td><p className="text-[13px] font-medium text-[var(--foreground)] font-mono">{inv.number}</p><p className="text-[11px] text-[var(--foreground-dim)]">{inv.issueDate}</p></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="badge text-[9px]" style={{ color: brandColor(inv.brand), backgroundColor: `${brandColor(inv.brand)}10` }}>{inv.brand}</span>
                        <span className="text-[13px] text-[var(--foreground-muted)]">{inv.clientName}</span>
                      </div>
                    </td>
                    <td className="text-right"><span className="text-[13px] font-medium text-[var(--foreground)] tabular-nums">{formatCurrency(inv.total)}</span></td>
                    <td className="text-center">
                      <span className="badge" style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => setSelectedInvoice(inv)} className="btn-ghost p-1.5"><Eye className="w-3.5 h-3.5" /></button>
                        {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                          <button onClick={() => markPaid(inv.id)} className="btn-ghost p-1.5 hover:!text-emerald-400" title="Mark Paid"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Detail */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[var(--foreground)] font-mono">{selectedInvoice.number}</p>
                <p className="text-[12px] text-[var(--foreground-dim)]">{selectedInvoice.clientName}</p>
              </div>
              <span className="badge" style={{ color: statusCfg[selectedInvoice.status].color, backgroundColor: `${statusCfg[selectedInvoice.status].color}15` }}>
                {statusCfg[selectedInvoice.status].label}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Issued</p><p className="text-[var(--foreground)]">{selectedInvoice.issueDate}</p></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Due</p><p className="text-[var(--foreground)]">{selectedInvoice.dueDate}</p></div>
                {selectedInvoice.paidDate && <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Paid</p><p className="text-emerald-400">{selectedInvoice.paidDate}</p></div>}
              </div>
              <div className="card overflow-hidden">
                <table className="data-table">
                  <thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr key={i}><td>{item.description}</td><td className="text-right tabular-nums">{item.quantity}</td><td className="text-right tabular-nums">{formatCurrency(item.rate)}</td><td className="text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.rate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--foreground-dim)]">Total</span>
                <span className="text-lg font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(selectedInvoice.total)}</span>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
              {(selectedInvoice.status === "PENDING" || selectedInvoice.status === "OVERDUE") && (
                <button onClick={() => markPaid(selectedInvoice.id)} className="btn-primary !bg-emerald-500 hover:!bg-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid</button>
              )}
              <button onClick={() => setSelectedInvoice(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">New Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Client *</label><select value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input-field"><option value="">Select...</option>{([] as { id: string; companyName: string }[]).map((c) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-[var(--foreground-dim)]">Line Items</label>
                  <button onClick={addLineItem} className="text-[11px] text-[var(--primary)] hover:underline">+ Add item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} placeholder="Description" className="input-field flex-1" />
                      <input type="number" value={item.quantity || ""} onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))} placeholder="Qty" className="input-field w-16 text-center" />
                      <input type="number" value={item.rate || ""} onChange={(e) => updateLineItem(idx, "rate", Number(e.target.value))} placeholder="Rate $" className="input-field w-24" />
                      {form.items.length > 1 && <button onClick={() => removeLineItem(idx)} className="btn-ghost p-1 hover:!text-red-400"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <span className="text-[13px] text-[var(--foreground-muted)]">Total</span>
                <span className="text-lg font-semibold text-[var(--primary)] tabular-nums">{formatCurrency(formTotal)}</span>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
