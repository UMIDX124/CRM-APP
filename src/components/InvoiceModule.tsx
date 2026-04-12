"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, FileText, Clock, CheckCircle2,
  AlertCircle, XCircle, Eye, X, Save, Loader2, Download,
} from "lucide-react";
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
        // Empty result from /api/invoices means the tenant genuinely has
        // no invoices — render the empty state instead of masking it with
        // sample data. Failures (network, 5xx) also surface as empty so the
        // UI shows a proper empty state + the console shows the error.
        if (data && Array.isArray(data)) {
          const mapped: Invoice[] = data.map((inv: Record<string, unknown>) => ({
            id: String(inv.id), number: String(inv.number || ""),
            clientId: String(inv.clientId || ""),
            clientName: (inv.client as Record<string, string>)?.companyName || "",
            brand: (inv.brand as Record<string, string>)?.code || "",
            items: (inv.items as InvoiceItem[]) || [],
            subtotal: Number(inv.subtotal) || 0, tax: Number(inv.tax) || 0,
            total: Number(inv.total) || 0,
            // Read the derived isOverdue flag from the API; fall back to
            // the persisted status when the backend didn't send it.
            status: (inv.isOverdue ? "OVERDUE" : String(inv.status || "PENDING")) as InvoiceStatus,
            issueDate: inv.issueDate ? String(inv.issueDate).split("T")[0] : "",
            dueDate: inv.dueDate ? String(inv.dueDate).split("T")[0] : "",
            paidDate: inv.paidDate ? String(inv.paidDate).split("T")[0] : undefined,
          }));
          setInvoices(mapped);
        } else {
          setInvoices([]);
        }
      })
      .catch((err) => {
        console.error("[invoices] fetch failed:", err);
        setInvoices([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompany.code]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ method: "bank_transfer", ref: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [paySubmitting, setPaySubmitting] = useState(false);
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

  const openPayModal = (id: string) => {
    setPayInvoiceId(id);
    setPayForm({ method: "bank_transfer", ref: "", date: new Date().toISOString().split("T")[0], notes: "" });
  };

  const confirmPayment = async () => {
    if (!payInvoiceId) return;
    setPaySubmitting(true);
    const result = await apiMutate(`/api/invoices/${payInvoiceId}`, "PATCH", {
      status: "PAID",
      paidDate: payForm.date,
      paymentMethod: payForm.method,
      paymentRef: payForm.ref || null,
      paymentNotes: payForm.notes || null,
    });
    if (!result.ok) { showError(result.error || "Failed to mark as paid"); setPaySubmitting(false); return; }
    setInvoices((prev) => prev.map((i) => (i.id === payInvoiceId ? { ...i, status: "PAID" as InvoiceStatus } : i)));
    success("Invoice marked as paid");
    setPayInvoiceId(null);
    setSelectedInvoice(null);
    setPaySubmitting(false);
  };

  // Legacy alias — buttons that used markPaid(id) now open the modal
  const markPaid = openPayModal;

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
                        <button onClick={() => setSelectedInvoice(inv)} className="btn-ghost p-1.5" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost p-1.5 hover:!text-[var(--primary)]"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
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
              <a
                href={`/api/invoices/${selectedInvoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
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

      {/* Mark as Paid Modal */}
      {payInvoiceId && (
        <div className="modal-overlay" onClick={() => setPayInvoiceId(null)}>
          <div className="modal-content w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Record Payment</h2>
              <button onClick={() => setPayInvoiceId(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Payment Method *</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Reference / Transaction #</label>
                <input
                  type="text"
                  value={payForm.ref}
                  onChange={(e) => setPayForm({ ...payForm, ref: e.target.value })}
                  placeholder="e.g. TXN-123456"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Notes</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Optional payment notes..."
                  rows={2}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
              <button onClick={() => setPayInvoiceId(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={confirmPayment}
                disabled={paySubmitting || !payForm.date}
                className="btn-primary !bg-emerald-500 hover:!bg-emerald-600 disabled:opacity-50"
              >
                {paySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
