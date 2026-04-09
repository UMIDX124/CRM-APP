"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, Briefcase, DollarSign, X, Save,
  Trash2, Edit, Loader2, TrendingUp, Target, LayoutGrid, List,
} from "lucide-react";
import { clsx } from "clsx";
// Employees fetched from API for sales rep dropdown
import { apiMutate } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/components/CompanyContext";
import { formatCurrency, extractBrandFromSource } from "@/lib/types";
import type { Lead, LeadStatus } from "@/lib/types";

const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];

const stages: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NEW", label: "New", color: "#3B82F6" },
  { status: "QUALIFIED", label: "Qualified", color: "#F59E0B" },
  { status: "PROPOSAL_SENT", label: "Proposal", color: "#F59E0B" },
  { status: "NEGOTIATION", label: "Negotiation", color: "#FF6B00" },
  { status: "WON", label: "Won", color: "#10B981" },
  { status: "LOST", label: "Lost", color: "#EF4444" },
];

const defaultForm = {
  companyName: "", contactName: "", email: "", country: "", source: "Website",
  brand: "VCS", value: 0, salesRep: "", services: "",
  probability: 50, expectedClose: "", nextAction: "", lastContactDate: "", nextContactDate: "",
};

export default function PipelineModule({ brandId: _brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const { activeCompany } = useCompany();
  const [leadList, setLeadList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; role: string }[]>([]);

  // Fetch employees for sales rep dropdown
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployeeList(data.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            role: String(e.role || "EMPLOYEE"),
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leads?brand=${activeCompany.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Lead[] = data.map((l: Record<string, unknown>) => ({
            id: String(l.id), companyName: String(l.companyName || ""), contactName: String(l.contactName || ""),
            email: String(l.email || ""), country: String(l.country || ""), countryFlag: "",
            services: Array.isArray(l.services) ? (l.services as string[]) : [],
            brand: (l.brand as Record<string, string>)?.code || String(l.brandId || ""),
            source: String(l.source || ""), status: String(l.status || "NEW") as LeadStatus,
            value: Number(l.value) || 0, salesRep: String(l.salesRepId || ""),
            createdAt: String(l.createdAt || ""),
          }));
          setLeadList(mapped);
        } else {
          setLeadList([]);
        }
      })
      .catch(() => { setLeadList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompany.code]);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return leadList;
    const q = search.toLowerCase();
    return leadList.filter((l) => l.companyName.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q));
  }, [leadList, search]);

  const stats = useMemo(() => ({
    total: leadList.length,
    totalValue: leadList.reduce((a, l) => a + l.value, 0),
    weightedForecast: leadList.filter((l) => l.status !== "LOST" && l.status !== "WON").reduce((a, l) => a + Math.round(l.value * (l.probability || 50) / 100), 0),
    won: leadList.filter((l) => l.status === "WON").reduce((a, l) => a + l.value, 0),
    convRate: leadList.length > 0 ? Math.round((leadList.filter((l) => l.status === "WON").length / leadList.length) * 100) : 0,
  }), [leadList]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      companyName: lead.companyName, contactName: lead.contactName, email: lead.email,
      country: lead.country || "", source: lead.source || "", brand: getBrand(lead),
      value: lead.value, salesRep: lead.salesRep || "", services: (lead.services || []).join(", "),
      probability: lead.probability || 50, expectedClose: lead.expectedClose || "",
      nextAction: lead.nextAction || "", lastContactDate: lead.lastContactDate || "",
      nextContactDate: lead.nextContactDate || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { showError("Company name required"); return; }
    if (!form.contactName.trim()) { showError("Contact name required"); return; }
    setSaving(true);
    const payload = {
      companyName: form.companyName, contactName: form.contactName, email: form.email,
      country: form.country, source: form.source, value: form.value,
      services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      probability: form.probability, expectedClose: form.expectedClose || null,
      nextAction: form.nextAction || null, lastContactDate: form.lastContactDate || null,
      nextContactDate: form.nextContactDate || null,
    };
    if (editingId) {
      const result = await apiMutate(`/api/leads/${editingId}`, "PATCH", payload);
      if (!result.ok) {
        showError(result.error || "Failed to update lead");
        setSaving(false);
        return;
      }
      setLeadList((prev) => prev.map((l): Lead => l.id === editingId ? {
        ...l, companyName: form.companyName, contactName: form.contactName, email: form.email,
        country: form.country, source: form.source, value: form.value, salesRep: form.salesRep,
        services: payload.services, probability: form.probability,
        expectedClose: form.expectedClose || undefined, nextAction: form.nextAction || undefined,
        lastContactDate: form.lastContactDate || undefined, nextContactDate: form.nextContactDate || undefined,
      } : l));
      success("Lead updated");
    } else {
      const result = await apiMutate("/api/leads", "POST", payload);
      if (!result.ok) {
        showError(result.error || "Failed to add lead");
        setSaving(false);
        return;
      }
      const newLead: Lead = {
        id: String(Date.now()), companyName: form.companyName, contactName: form.contactName,
        email: form.email, country: form.country, countryFlag: "", brand: form.brand,
        source: form.source, status: "NEW" as LeadStatus, value: form.value,
        salesRep: form.salesRep, createdAt: new Date().toISOString().split("T")[0],
        services: payload.services, probability: form.probability,
        expectedClose: form.expectedClose || undefined, nextAction: form.nextAction || undefined,
        lastContactDate: form.lastContactDate || undefined, nextContactDate: form.nextContactDate || undefined,
      };
      setLeadList((prev) => [...prev, newLead]);
      success("Lead added");
    }
    setSaving(false);
    setShowModal(false);
  };

  const moveStage = async (leadId: string, newStatus: LeadStatus) => {
    const result = await apiMutate(`/api/leads/${leadId}`, "PATCH", { status: newStatus });
    if (!result.ok) {
      showError(result.error || "Failed to move lead");
      return;
    }
    setLeadList((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    const st = stages.find((s) => s.status === newStatus);
    success(`Moved to ${st?.label}`);
  };

  const handleDelete = async (id: string) => {
    const result = await apiMutate(`/api/leads/${id}`, "DELETE");
    if (!result.ok) {
      showError(result.error || "Failed to remove lead");
      return;
    }
    setLeadList((prev) => prev.filter((l) => l.id !== id));
    setShowDeleteConfirm(null);
    success("Lead removed");
  };

  const brandColor = (code?: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";
  const getBrand = (lead: Lead) => lead.brand || extractBrandFromSource(lead.source);

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="kpi-card"><div className="flex items-center gap-2 mb-2"><Briefcase className="w-3.5 h-3.5 text-[var(--primary)]" /><span className="text-[11px] text-[var(--foreground-dim)]">Leads</span></div><p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{stats.total}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px] text-[var(--foreground-dim)]">Pipeline</span></div><p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(stats.totalValue, true)}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-2"><Target className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[11px] text-[var(--foreground-dim)]">Forecast</span></div><p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(stats.weightedForecast, true)}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-[var(--foreground-dim)]">Won</span></div><p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(stats.won, true)}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-2"><Target className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-[var(--foreground-dim)]">Win Rate</span></div><p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{stats.convRate}%</p></div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="search-box flex-1"><Search className="w-3.5 h-3.5" /><input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-8" /></div>
        <div className="tab-list !p-0.5">
          <button onClick={() => setViewMode("kanban")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "kanban" ? "active" : ""}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "list" ? "active" : ""}`}><List className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap"><Plus className="w-4 h-4" /> Add Lead</button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="kanban-column p-4 space-y-3">
              <div className="flex items-center justify-between mb-2"><div className="h-3 w-20 skeleton rounded" /><div className="h-5 w-5 skeleton rounded" /></div>
              {Array.from({ length: 2 + (col % 2) }).map((_, card) => (
                <div key={card} className="kanban-card space-y-2.5">
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-3 w-1/2 skeleton rounded" />
                  <div className="flex items-center gap-2"><div className="w-5 h-5 skeleton rounded-full" /><div className="h-2.5 w-16 skeleton rounded" /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
          {stages.filter((s) => s.status !== "LOST").map((stage) => {
            const stageLeads = filtered.filter((l) => l.status === stage.status);
            const stageValue = stageLeads.reduce((a, l) => a + l.value, 0);
            const isDragOver = dragOverStage === stage.status;
            return (
              <div
                key={stage.status}
                className={clsx(
                  "kanban-column p-3 min-w-[180px] transition-colors",
                  isDragOver && "border-[var(--primary)] bg-[var(--primary)]/5"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage.status) setDragOverStage(stage.status);
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column entirely, not entering a child
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData("text/plain");
                  setDragOverStage(null);
                  setDraggingId(null);
                  if (leadId) {
                    const lead = leadList.find((l) => l.id === leadId);
                    if (lead && lead.status !== stage.status) {
                      moveStage(leadId, stage.status);
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-[12px] font-medium text-[var(--foreground)]">{stage.label}</span>
                    <span className="text-[11px] text-[var(--foreground-dim)] tabular-nums">{stageLeads.length}</span>
                  </div>
                  <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">{formatCurrency(stageValue, true)}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(lead.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                      className={clsx(
                        "kanban-card group cursor-grab active:cursor-grabbing",
                        draggingId === lead.id && "opacity-40 scale-95"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-[12px] font-medium text-[var(--foreground)] truncate flex-1 pr-1">{lead.companyName}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openEdit(lead)} className="btn-ghost p-0.5"><Edit className="w-2.5 h-2.5" /></button>
                          <button onClick={() => setShowDeleteConfirm(lead.id)} className="btn-ghost p-0.5 hover:!text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--foreground-dim)] mb-2">{lead.contactName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[var(--foreground)] tabular-nums">{formatCurrency(lead.value)}</span>
                        {getBrand(lead) && <span className="badge text-[9px]" style={{ color: brandColor(getBrand(lead)), backgroundColor: `${brandColor(getBrand(lead))}10` }}>{getBrand(lead)}</span>}
                      </div>
                      {stage.status !== "WON" && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                          {stage.status === "NEW" && <button onClick={() => moveStage(lead.id, "QUALIFIED")} className="flex-1 text-[10px] py-1 rounded-md bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors">Qualify</button>}
                          {stage.status === "QUALIFIED" && <button onClick={() => moveStage(lead.id, "PROPOSAL_SENT")} className="flex-1 text-[10px] py-1 rounded-md bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors">Proposal</button>}
                          {stage.status === "PROPOSAL_SENT" && <button onClick={() => moveStage(lead.id, "NEGOTIATION")} className="flex-1 text-[10px] py-1 rounded-md bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors">Negotiate</button>}
                          {stage.status === "NEGOTIATION" && (
                            <>
                              <button onClick={() => moveStage(lead.id, "WON")} className="flex-1 text-[10px] py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Won</button>
                              <button onClick={() => moveStage(lead.id, "LOST")} className="flex-1 text-[10px] py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Lost</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-center"><p className="text-[11px] text-[var(--foreground-dim)]">No leads</p></div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Stage</th>
                  <th className="text-right">Deal Size</th>
                  <th className="text-center">Probability</th>
                  <th className="text-right">Forecast</th>
                  <th>Close Date</th>
                  <th>Last Contact</th>
                  <th>Next Contact</th>
                  <th>Next Action</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const stage = stages.find((s) => s.status === lead.status);
                  const prob = lead.probability || 50;
                  const forecast = Math.round(lead.value * prob / 100);
                  return (
                    <tr key={lead.id} onClick={() => openEdit(lead)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-2">
                          {getBrand(lead) && <span className="badge text-[9px]" style={{ color: brandColor(getBrand(lead)), backgroundColor: `${brandColor(getBrand(lead))}10` }}>{getBrand(lead)}</span>}
                          <span className="text-[13px] font-medium text-[var(--foreground)]">{lead.companyName}</span>
                        </div>
                      </td>
                      <td className="text-[var(--foreground-muted)]">{lead.contactName}</td>
                      <td><span className="badge" style={{ color: stage?.color, backgroundColor: `${stage?.color}15` }}>{stage?.label}</span></td>
                      <td className="text-right tabular-nums font-medium text-[var(--foreground)]">{formatCurrency(lead.value)}</td>
                      <td className="text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-10 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${prob}%`, backgroundColor: prob >= 70 ? "#10B981" : prob >= 40 ? "#F59E0B" : "#EF4444" }} />
                          </div>
                          <span className="text-[11px] tabular-nums" style={{ color: prob >= 70 ? "#10B981" : prob >= 40 ? "#F59E0B" : "#EF4444" }}>{prob}%</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums text-emerald-400 font-medium">{formatCurrency(forecast)}</td>
                      <td className="text-[var(--foreground-dim)] text-[12px]">{lead.expectedClose || "—"}</td>
                      <td className="text-[var(--foreground-dim)] text-[12px]">{lead.lastContactDate || "—"}</td>
                      <td className="text-[var(--foreground-dim)] text-[12px]">{lead.nextContactDate || "—"}</td>
                      <td className="text-[var(--foreground-muted)] text-[12px] max-w-[120px] truncate">{lead.nextAction || "—"}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEdit(lead)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setShowDeleteConfirm(lead.id)} className="btn-ghost p-1.5 hover:!text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{editingId ? "Edit Lead" : "New Lead"}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Company *</label><input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Contact *</label><input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Value ($)</label><input type="number" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Source</label><select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input-field">{["Website", "LinkedIn", "Referral", "Cold Outreach", "Conference"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Sales Rep</label><select value={form.salesRep} onChange={(e) => setForm({ ...form, salesRep: e.target.value })} className="input-field"><option value="">Unassigned</option>{employeeList.filter((e) => ["SUPER_ADMIN", "PROJECT_MANAGER", "TEAM_LEAD"].includes(e.role)).map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
              </div>
              <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Services (comma-separated)</label><input type="text" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Web Dev, SEO" className="input-field" /></div>
              {/* Smartsheet Pipeline Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Probability %</label><input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Projected Close Date</label><input type="date" value={form.expectedClose} onChange={(e) => setForm({ ...form, expectedClose: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Last Contact Date</label><input type="date" value={form.lastContactDate} onChange={(e) => setForm({ ...form, lastContactDate: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Next Contact Date</label><input type="date" value={form.nextContactDate} onChange={(e) => setForm({ ...form, nextContactDate: e.target.value })} className="input-field" /></div>
                <div className="sm:col-span-2"><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Next Action</label><input type="text" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} placeholder="Send proposal, Schedule demo..." className="input-field" /></div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {editingId ? "Save" : "Add Lead"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-2">Remove Lead</h3>
            <p className="text-[13px] text-[var(--foreground-muted)] mb-5">Remove <strong className="text-[var(--foreground)]">{leadList.find((l) => l.id === showDeleteConfirm)?.companyName}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-primary !bg-red-500 hover:!bg-red-600">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
