"use client";

import { useState, useMemo } from "react";
import {
  Search, Plus, Briefcase, DollarSign, User, ChevronRight, X, Save,
  Trash2, Edit, Loader2, AlertTriangle, TrendingUp, Target, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import { leads as mockLeads, brands, employees } from "@/data/mock-data";
import { useData, apiMutate } from "@/lib/use-data";
import { useToast } from "@/components/ui/toast";

type LeadStatus = "NEW" | "QUALIFIED" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST";

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  countryFlag: string;
  services: string[];
  brand?: string;
  source: string;
  status: LeadStatus;
  value: number;
  salesRep: string;
  createdAt: string;
}

const stages: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NEW", label: "New", color: "#3B82F6" },
  { status: "QUALIFIED", label: "Qualified", color: "#8B5CF6" },
  { status: "PROPOSAL_SENT", label: "Proposal", color: "#F59E0B" },
  { status: "NEGOTIATION", label: "Negotiation", color: "#FF6B00" },
  { status: "WON", label: "Won", color: "#10B981" },
  { status: "LOST", label: "Lost", color: "#EF4444" },
];

const defaultForm = {
  companyName: "", contactName: "", email: "", country: "", source: "Website",
  brand: "VCS", value: 0, salesRep: "", services: "",
};

export default function PipelineModule({ brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const { data: leadList, setData: setLeadList, loading } = useData<Lead[]>({
    apiUrl: "/api/leads", mockData: mockLeads as unknown as Lead[],
  });

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return leadList;
    const q = search.toLowerCase();
    return leadList.filter((l) =>
      l.companyName.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q)
    );
  }, [leadList, search]);

  const stats = useMemo(() => ({
    total: leadList.length,
    totalValue: leadList.reduce((a, l) => a + l.value, 0),
    won: leadList.filter((l) => l.status === "WON").reduce((a, l) => a + l.value, 0),
    convRate: leadList.length > 0 ? Math.round((leadList.filter(l => l.status === "WON").length / leadList.length) * 100) : 0,
  }), [leadList]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      companyName: lead.companyName, contactName: lead.contactName,
      email: lead.email, country: lead.country || "", source: lead.source || "",
      brand: lead.brand || "VCS", value: lead.value, salesRep: lead.salesRep || "",
      services: (lead.services || []).join(", "),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { showError("Company name required"); return; }
    if (!form.contactName.trim()) { showError("Contact name required"); return; }

    setSaving(true);
    if (editingId) {
      await apiMutate(`/api/leads/${editingId}`, "PATCH", form);
      setLeadList((prev) => prev.map((l) => l.id === editingId ? {
        ...l, companyName: form.companyName, contactName: form.contactName,
        email: form.email, country: form.country, source: form.source,
        value: form.value, salesRep: form.salesRep,
        services: form.services.split(",").map(s => s.trim()).filter(Boolean),
      } : l));
      success("Lead updated");
    } else {
      await apiMutate("/api/leads", "POST", {
        companyName: form.companyName, contactName: form.contactName,
        email: form.email, country: form.country, source: form.source,
        value: form.value, services: form.services.split(",").map(s => s.trim()).filter(Boolean),
      });
      setLeadList((prev) => [...prev, {
        id: String(Date.now()), companyName: form.companyName, contactName: form.contactName,
        email: form.email, country: form.country, countryFlag: "",
        services: form.services.split(",").map(s => s.trim()).filter(Boolean),
        brand: form.brand, source: form.source, status: "NEW" as LeadStatus,
        value: form.value, salesRep: form.salesRep, createdAt: new Date().toISOString().split("T")[0],
      }]);
      success(`${form.companyName} added to pipeline!`);
    }
    setSaving(false);
    setShowModal(false);
  };

  const moveStage = async (leadId: string, newStatus: LeadStatus) => {
    await apiMutate(`/api/leads/${leadId}`, "PATCH", { status: newStatus });
    setLeadList((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    const lead = leadList.find(l => l.id === leadId);
    success(`${lead?.companyName} moved to ${stages.find(s => s.status === newStatus)?.label}`);
  };

  const handleDelete = async (id: string) => {
    await apiMutate(`/api/leads/${id}`, "DELETE");
    setLeadList((prev) => prev.filter((l) => l.id !== id));
    setShowDeleteConfirm(null);
    success("Lead removed");
  };

  const brandColor = (code?: string) => {
    if (!code) return "#FF6B00";
    return brands.find((b) => b.code === code)?.color || "#FF6B00";
  };
  // Extract brand from source field (e.g., "Website - BSL" → "BSL")
  const getBrand = (lead: Lead) => {
    if (lead.brand) return lead.brand;
    if (lead.source) {
      const match = lead.source.match(/- (VCS|BSL|DPL)/);
      if (match) return match[1];
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-[#FF6B00]" /><span className="text-xs text-white/50">Total Leads</span></div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-[#F59E0B]" /><span className="text-xs text-white/50">Pipeline Value</span></div>
          <p className="text-2xl font-bold text-white">${(stats.totalValue / 1000).toFixed(0)}K</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-400" /><span className="text-xs text-white/50">Won Value</span></div>
          <p className="text-2xl font-bold text-white">${(stats.won / 1000).toFixed(0)}K</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-emerald-400" /><span className="text-xs text-white/50">Win Rate</span></div>
          <p className="text-2xl font-bold text-white">{stats.convRate}%</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <div className="flex gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          <button onClick={() => setViewMode("kanban")} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "kanban" ? "bg-white/10 text-white" : "text-white/40")}>Kanban</button>
          <button onClick={() => setViewMode("list")} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "list" ? "bg-white/10 text-white" : "text-white/40")}>List</button>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-bold text-sm">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Kanban View */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}</div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 overflow-x-auto">
          {stages.filter(s => s.status !== "LOST").map((stage) => {
            const stageLeads = filtered.filter((l) => l.status === stage.status);
            const stageValue = stageLeads.reduce((a, l) => a + l.value, 0);
            return (
              <div key={stage.status} className="min-w-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-medium text-white">{stage.label}</span>
                    <span className="text-xs text-white/30">{stageLeads.length}</span>
                  </div>
                  <span className="text-xs text-white/30">${(stageValue / 1000).toFixed(0)}K</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-white truncate flex-1">{lead.companyName}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(lead)} className="p-1 rounded hover:bg-white/10 text-white/30"><Edit className="w-3 h-3" /></button>
                          <button onClick={() => setShowDeleteConfirm(lead.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <p className="text-xs text-white/40 mb-2">{lead.contactName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">${lead.value.toLocaleString()}</span>
                        {getBrand(lead) && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ color: brandColor(getBrand(lead)), backgroundColor: brandColor(getBrand(lead)) + "10" }}>{getBrand(lead)}</span>}
                      </div>
                      {/* Move buttons */}
                      {stage.status !== "WON" && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-white/[0.04]">
                          {stage.status === "NEW" && <button onClick={() => moveStage(lead.id, "QUALIFIED")} className="flex-1 text-[10px] py-1 rounded bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">Qualify</button>}
                          {stage.status === "QUALIFIED" && <button onClick={() => moveStage(lead.id, "PROPOSAL_SENT")} className="flex-1 text-[10px] py-1 rounded bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">Send Proposal</button>}
                          {stage.status === "PROPOSAL_SENT" && <button onClick={() => moveStage(lead.id, "NEGOTIATION")} className="flex-1 text-[10px] py-1 rounded bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">Negotiate</button>}
                          {stage.status === "NEGOTIATION" && (
                            <>
                              <button onClick={() => moveStage(lead.id, "WON")} className="flex-1 text-[10px] py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Won</button>
                              <button onClick={() => moveStage(lead.id, "LOST")} className="flex-1 text-[10px] py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">Lost</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="p-6 rounded-xl border border-dashed border-white/[0.06] text-center">
                      <p className="text-xs text-white/20">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Source</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const stage = stages.find(s => s.status === lead.status);
                return (
                  <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.companyName}</p>
                      <p className="text-xs text-white/40">{lead.contactName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: stage?.color, backgroundColor: stage?.color + "15" }}>{stage?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">${lead.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-white/50 hidden md:table-cell">{lead.source}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(lead)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setShowDeleteConfirm(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111114] border border-white/10 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-[#111114] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Lead" : "Add New Lead"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Company Name *</label>
                  <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Lead company" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Contact Person *</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Decision maker" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@lead.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Deal Value ($)</label>
                  <input type="number" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    placeholder="10000" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Source</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {["Website", "LinkedIn", "Referral", "Cold Outreach", "Conference", "Other"].map(s => <option key={s} value={s} className="bg-[#111114]">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Sales Rep</label>
                  <select value={form.salesRep} onChange={(e) => setForm({ ...form, salesRep: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    <option value="" className="bg-[#111114]">Unassigned</option>
                    {employees.filter(e => ["SUPER_ADMIN", "PROJECT_MANAGER", "TEAM_LEAD"].includes(e.role)).map(e => <option key={e.id} value={e.name} className="bg-[#111114]">{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Services (comma-separated)</label>
                <input type="text" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })}
                  placeholder="Web Dev, SEO, Marketing" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-[#111114] border-t border-white/[0.06] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div><div><h3 className="text-white font-semibold">Remove Lead</h3></div></div>
            <p className="text-sm text-white/60 mb-6">Remove <strong className="text-white">{leadList.find(l => l.id === showDeleteConfirm)?.companyName}</strong> from pipeline?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
