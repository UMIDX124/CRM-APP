"use client";

import { useState, useMemo } from "react";
import {
  Search, Plus, Building2, Phone, Mail, Globe, Edit, Trash2, Eye, X, Save,
  Download, AlertTriangle, Loader2, TrendingUp, Heart,
} from "lucide-react";
import { clsx } from "clsx";
import { clients as mockClients, brands } from "@/data/mock-data";
import { useData, apiMutate } from "@/lib/use-data";
import { useToast } from "@/components/ui/toast";

interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  countryFlag: string;
  brand: string;
  accountManager: string;
  mrr: number;
  healthScore: number;
  healthStatus: string;
  services: string[];
  activeTasks: number;
  lastActivity: string;
  result?: string;
}

const defaultForm = {
  companyName: "", contactName: "", email: "", phone: "",
  country: "United States", brand: "VCS", mrr: 0, healthScore: 80,
  services: [] as string[], source: "Website",
};

const countries = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "UAE", "Pakistan", "India", "Singapore"];

export default function ClientManagement({ brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const { data: clientList, setData: setClientList, loading } = useData<Client[]>({
    apiUrl: "/api/clients", mockData: mockClients,
  });

  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState("");

  const filtered = useMemo(() => {
    return clientList.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.companyName.toLowerCase().includes(q) && !c.contactName.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      }
      if (filterBrand !== "ALL" && c.brand !== filterBrand) return false;
      return true;
    });
  }, [clientList, search, filterBrand, filterStatus]);

  const stats = useMemo(() => ({
    total: clientList.length,
    totalMRR: clientList.reduce((a, c) => a + (c.mrr || 0), 0),
    avgHealth: clientList.length > 0 ? Math.round(clientList.reduce((a, c) => a + (c.healthScore || 80), 0) / clientList.length) : 0,
  }), [clientList]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      companyName: client.companyName, contactName: client.contactName,
      email: client.email, phone: client.phone || "", country: client.country || "",
      brand: client.brand, mrr: client.mrr || 0, healthScore: client.healthScore || 80,
      services: client.services || [], source: "Website",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { showError("Company name required"); return; }
    if (!form.contactName.trim()) { showError("Contact name required"); return; }
    if (!form.email.trim()) { showError("Email required"); return; }

    setSaving(true);

    if (editingId) {
      await apiMutate(`/api/clients/${editingId}`, "PATCH", form);
      setClientList((prev) => prev.map((c) => c.id === editingId ? {
        ...c, companyName: form.companyName, contactName: form.contactName,
        email: form.email, phone: form.phone, country: form.country,
        brand: form.brand, mrr: form.mrr, healthScore: form.healthScore,
        services: form.services,
      } : c));
      success("Client updated");
    } else {
      await apiMutate("/api/clients", "POST", {
        companyName: form.companyName, contactName: form.contactName,
        email: form.email, phone: form.phone, country: form.country,
        brandId: brands.find(b => b.code === form.brand)?.id, mrr: form.mrr,
        healthScore: form.healthScore, source: form.source,
      });
      const newClient: Client = {
        id: String(Date.now()), ...form, countryFlag: "", accountManager: "",
        healthStatus: form.healthScore >= 80 ? "HEALTHY" : "AT_RISK",
        activeTasks: 0, lastActivity: "Just now",
      };
      setClientList((prev) => [...prev, newClient]);
      success(`${form.companyName} added!`);
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await apiMutate(`/api/clients/${id}`, "DELETE");
    setClientList((prev) => prev.filter((c) => c.id !== id));
    setShowDeleteConfirm(null);
    success("Client removed");
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  const healthColor = (score: number) => score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const healthBg = (score: number) => score >= 80 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-[#FF6B00]" /><span className="text-xs text-white/50">Total Clients</span></div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-400" /><span className="text-xs text-white/50">Total MRR</span></div>
          <p className="text-2xl font-bold text-white">${(stats.totalMRR / 1000).toFixed(1)}K</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-emerald-400" /><span className="text-xs text-white/50">Avg Health</span></div>
          <p className="text-2xl font-bold text-white">{stats.avgHealth}%</p>
        </div>
        {brands.map((b) => (
          <div key={b.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] lg:hidden first:block">
            <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} /><span className="text-xs text-white/50">{b.code}</span></div>
            <p className="text-2xl font-bold text-white">{clientList.filter(c => c.brand === b.code).length}</p>
          </div>
        )).slice(0, 1)}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search company, contact, or email..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#111114]">All Companies</option>
          {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#111114]">{b.code}</option>)}
        </select>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-bold text-sm">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm mb-4">{search ? "No clients match" : "No clients yet"}</p>
          <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-sm font-medium">
            <Plus className="w-4 h-4 inline mr-2" />Add first client
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">MRR</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Health</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white/80">{client.companyName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{client.companyName}</p>
                        <p className="text-xs text-white/40">{client.contactName} &bull; {client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: brandColor(client.brand), backgroundColor: brandColor(client.brand) + "10" }}>{client.brand}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-white">${(client.mrr || 0).toLocaleString()}</span>
                    <span className="text-xs text-white/30">/mo</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={clsx("h-full rounded-full", healthBg(client.healthScore))} style={{ width: `${client.healthScore}%` }} />
                      </div>
                      <span className={clsx("text-xs font-medium", healthColor(client.healthScore))}>{client.healthScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewClient(client)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setShowDeleteConfirm(client.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Client Detail */}
      {viewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewClient(null)} />
          <div className="relative w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{viewClient.companyName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{viewClient.companyName}</h3>
                    <p className="text-sm text-white/40">{viewClient.contactName}</p>
                  </div>
                </div>
                <button onClick={() => setViewClient(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-white/40 mb-1">Email</p><p className="text-white">{viewClient.email}</p></div>
                <div><p className="text-xs text-white/40 mb-1">Phone</p><p className="text-white">{viewClient.phone || "—"}</p></div>
                <div><p className="text-xs text-white/40 mb-1">Country</p><p className="text-white">{viewClient.country || "—"}</p></div>
                <div><p className="text-xs text-white/40 mb-1">Company</p><span className="px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ color: brandColor(viewClient.brand), backgroundColor: brandColor(viewClient.brand) + "10" }}>{viewClient.brand}</span></div>
                <div><p className="text-xs text-white/40 mb-1">MRR</p><p className="text-white font-semibold">${viewClient.mrr.toLocaleString()}/mo</p></div>
                <div><p className="text-xs text-white/40 mb-1">Health Score</p><p className={clsx("font-semibold", healthColor(viewClient.healthScore))}>{viewClient.healthScore}%</p></div>
              </div>
              {viewClient.services && viewClient.services.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {viewClient.services.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewClient.result && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400/70 mb-1">Result</p>
                  <p className="text-sm text-emerald-400">{viewClient.result}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button onClick={() => { setViewClient(null); openEdit(viewClient); }} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm flex items-center gap-2"><Edit className="w-4 h-4" /> Edit</button>
              <button onClick={() => setViewClient(null)} className="px-4 py-2 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111114] border border-white/10 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-[#111114] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Client" : "Add New Client"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Company Name *</label>
                  <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Acme Corp" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Contact Person *</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="John Smith" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@acme.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 555-0123" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Assign to Company</label>
                  <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#111114]">{b.code} - {b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Country</label>
                  <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {countries.map((c) => <option key={c} value={c} className="bg-[#111114]">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Monthly Revenue ($)</label>
                  <input type="number" value={form.mrr || ""} onChange={(e) => setForm({ ...form, mrr: Number(e.target.value) })}
                    placeholder="5000" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Health Score (0-100)</label>
                  <input type="number" min={0} max={100} value={form.healthScore} onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
              </div>
              {/* Services */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Services</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.services.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                      {s}<button onClick={() => setForm({ ...form, services: form.services.filter((x) => x !== s) })} className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newService.trim()) { setForm({ ...form, services: [...form.services, newService.trim()] }); setNewService(""); } } }}
                    placeholder="Add service + Enter" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[#111114] border-t border-white/[0.06] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save" : "Add Client"}
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <div><h3 className="text-white font-semibold">Remove Client</h3><p className="text-xs text-white/40">This cannot be undone</p></div>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Remove <strong className="text-white">{clientList.find((c) => c.id === showDeleteConfirm)?.companyName}</strong>?
            </p>
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
