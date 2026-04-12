"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Plus, Building2, Edit, Trash2, Eye, X, Save,
  Loader2, TrendingUp, Heart, ArrowUpDown, Mail, Globe, Send, Sparkles, Copy,
} from "lucide-react";
import dynamic from "next/dynamic";
const ClientEmails = dynamic(() => import("@/components/ClientEmails"), { ssr: false });
import { clsx } from "clsx";
const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];
import { apiMutate } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/components/CompanyContext";
import type { Client } from "@/lib/types";
import { formatCurrency } from "@/lib/types";

const defaultForm = {
  companyName: "", contactName: "", email: "", phone: "",
  country: "United States", brand: "VCS", mrr: 0, healthScore: 80,
  services: [] as string[], source: "Website",
  lastContactDate: "", nextFollowUp: "",
};

const countries = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "UAE", "Pakistan", "India", "Singapore"];

function mapClientRow(c: Record<string, unknown>): Client {
  const score = Number(c.healthScore) || 80;
  return {
    id: String(c.id),
    companyName: String(c.companyName || ""),
    contactName: String(c.contactName || ""),
    email: String(c.email || ""),
    phone: String(c.phone || ""),
    country: String(c.country || ""),
    countryFlag: String(c.countryFlag || ""),
    brand: (c.brand as Record<string, string>)?.code || String(c.brand || ""),
    accountManager: String(c.accountManager || ""),
    mrr: Number(c.mrr) || 0,
    healthScore: score,
    healthStatus: score >= 80 ? "HEALTHY" : score >= 50 ? "AT_RISK" : "CRITICAL",
    services: Array.isArray(c.services) ? (c.services as string[]) : [],
    activeTasks:
      Number((c._count as Record<string, unknown> | undefined)?.tasks) ||
      Number(c.activeTasks) ||
      0,
    lastActivity: String(c.lastActivity || ""),
  };
}

type SortKey = "companyName" | "mrr" | "healthScore" | "brand";
type SortDir = "asc" | "desc";

export default function ClientManagement({ brandId: _brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const { activeCompany } = useCompany();
  const [clientList, setClientList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async (): Promise<Client[] | null> => {
    try {
      const r = await fetch(`/api/clients?brand=${activeCompany.code}`, { cache: "no-store" });
      if (!r.ok) return null;
      const data = await r.json();
      if (!Array.isArray(data)) return null;
      return data.map((c: Record<string, unknown>) => mapClientRow(c));
    } catch {
      return null;
    }
  }, [activeCompany.code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadClients()
      .then((rows) => {
        if (cancelled) return;
        setClientList(rows ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadClients]);

  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("companyName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 10;
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefText, setBriefText] = useState<string | null>(null);

  const handleGenerateBrief = async (clientId: string) => {
    setBriefLoading(true);
    setBriefText(null);
    try {
      const res = await fetch("/api/ai/client-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate brief");
      setBriefText(data.brief);
      success("Brief generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setBriefLoading(false);
    }
  };

  const copyBrief = async () => {
    if (!briefText) return;
    try {
      await navigator.clipboard.writeText(briefText);
      success("Copied to clipboard");
    } catch {
      showError("Clipboard unavailable");
    }
  };

  const filtered = useMemo(() => {
    const list = clientList.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.companyName.toLowerCase().includes(q) && !c.contactName.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      }
      if (filterBrand !== "ALL" && c.brand !== filterBrand) return false;
      return true;
    });
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [clientList, search, filterBrand, sortKey, sortDir]);

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const stats = useMemo(() => ({
    total: clientList.length,
    totalMRR: clientList.reduce((a, c) => a + (c.mrr || 0), 0),
    avgHealth: clientList.length > 0 ? Math.round(clientList.reduce((a, c) => a + (c.healthScore || 80), 0) / clientList.length) : 0,
  }), [clientList]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      companyName: client.companyName, contactName: client.contactName,
      email: client.email, phone: client.phone || "", country: client.country || "",
      brand: client.brand, mrr: client.mrr || 0, healthScore: client.healthScore || 80,
      services: client.services || [], source: client.source || "Website",
      lastContactDate: client.lastContactDate || "", nextFollowUp: client.nextFollowUp || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { showError("Company name required"); return; }
    if (!form.contactName.trim()) { showError("Contact name required"); return; }
    if (!form.email.trim()) { showError("Email required"); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { showError("Valid email is required"); return; }
    setSaving(true);

    const payload = {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      country: form.country || null,
      brandCode: form.brand,
      mrr: Number(form.mrr) || 0,
      healthScore: Number(form.healthScore) || 80,
      source: form.source || null,
      services: form.services,
      lastContactDate: form.lastContactDate || null,
      nextFollowUp: form.nextFollowUp || null,
    };

    if (editingId) {
      const result = await apiMutate(`/api/clients/${editingId}`, "PATCH", payload);
      if (!result.ok) {
        showError(result.error || "Failed to update client");
        setSaving(false);
        return;
      }
      // Refetch authoritative data to stay consistent with server
      const fresh = await loadClients();
      if (fresh) setClientList(fresh);
      success("Client updated");
    } else {
      const result = await apiMutate("/api/clients", "POST", payload);
      if (!result.ok) {
        showError(result.error || "Failed to add client");
        setSaving(false);
        return;
      }
      const fresh = await loadClients();
      if (fresh) setClientList(fresh);
      success(`${payload.companyName} added`);
    }
    setSaving(false);
    setShowModal(false);
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const result = await apiMutate(`/api/clients/${id}`, "DELETE");
    if (!result.ok) { showError(result.error || "Failed to delete client"); setShowDeleteConfirm(null); return; }
    setClientList((prev) => prev.filter((c) => c.id !== id));
    setShowDeleteConfirm(null);
    success("Client removed");
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";
  const healthColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-[11px] text-[var(--foreground-dim)]">Total Clients</span>
          </div>
          <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{stats.total}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-[var(--foreground-dim)]">Total MRR</span>
          </div>
          <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(stats.totalMRR, true)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-[var(--foreground-dim)]">Avg Health</span>
          </div>
          <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{stats.avgHealth}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="search-box flex-1">
          <Search className="w-3.5 h-3.5" />
          <input
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-field pl-8"
          />
        </div>
        <select
          value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setPage(0); }}
          className="input-field w-auto min-w-[120px]"
        >
          <option value="ALL">All Brands</option>
          {brands.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
        </select>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-glow overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
            {["w-20","w-24","w-16","w-20","w-14"].map((w,i) => <div key={i} className={`h-3 ${w} skeleton rounded`} />)}
          </div>
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="w-9 h-9 skeleton rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5"><div className="h-3.5 w-28 skeleton rounded" /><div className="h-2.5 w-20 skeleton rounded" /></div>
              <div className="h-3 w-16 skeleton rounded" />
              <div className="h-5 w-14 skeleton rounded-full" />
              <div className="h-3 w-12 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Building2 className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-[13px] mb-3">{search ? "No clients match your search" : "No clients yet"}</p>
          <button onClick={openAdd} className="btn-secondary"><Plus className="w-3.5 h-3.5" /> Add first client</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => toggleSort("companyName")} className="flex items-center gap-1 hover:text-[var(--foreground-muted)]">
                      Client <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="hidden sm:table-cell">Brand</th>
                  <th>
                    <button onClick={() => toggleSort("mrr")} className="flex items-center gap-1 hover:text-[var(--foreground-muted)] ml-auto">
                      MRR <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="hidden md:table-cell">
                    <button onClick={() => toggleSort("healthScore")} className="flex items-center gap-1 hover:text-[var(--foreground-muted)]">
                      Health <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right hidden sm:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((client) => (
                  <tr key={client.id} onClick={() => setViewClient(client)} className="cursor-pointer sm:cursor-default">
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
                          style={{ backgroundColor: `${brandColor(client.brand)}12`, color: brandColor(client.brand) }}
                        >
                          {client.companyName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{client.companyName}</p>
                          <p className="text-[11px] text-[var(--foreground-dim)] truncate">{client.contactName} &middot; {client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span
                        className="badge"
                        style={{ color: brandColor(client.brand), backgroundColor: `${brandColor(client.brand)}10`, borderColor: `${brandColor(client.brand)}20` }}
                      >
                        {client.brand}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="text-[12px] sm:text-[13px] font-medium text-[var(--foreground)] tabular-nums">{formatCurrency(client.mrr, true)}</span>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className={clsx(
                            "w-2 h-2 rounded-full shrink-0",
                            client.healthScore >= 80
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                              : client.healthScore >= 50
                              ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                              : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                          )}
                          title={
                            client.healthScore >= 80 ? "Healthy" :
                            client.healthScore >= 50 ? "At Risk" : "Critical"
                          }
                        />
                        <div className="w-14 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all",
                              client.healthScore >= 80
                                ? "bg-emerald-400"
                                : client.healthScore >= 50
                                ? "bg-amber-400"
                                : "bg-red-400"
                            )}
                            style={{ width: `${client.healthScore}%` }}
                          />
                        </div>
                        <span className={clsx("text-[11px] font-semibold tabular-nums min-w-[24px]", healthColor(client.healthScore))}>
                          {client.healthScore}
                        </span>
                      </div>
                    </td>
                    <td className="text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => setViewClient(client)} className="btn-ghost p-1.5"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(client)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowDeleteConfirm(client.id)} className="btn-ghost p-1.5 hover:!text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--foreground-dim)]">
                {filtered.length} client{filtered.length !== 1 ? "s" : ""} &middot; Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-ghost text-[11px] disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-ghost text-[11px] disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Client Detail */}
      {viewClient && (
        <div className="modal-overlay" onClick={() => setViewClient(null)}>
          <div className="modal-content w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-semibold" style={{ backgroundColor: `${brandColor(viewClient.brand)}15`, color: brandColor(viewClient.brand) }}>
                    {viewClient.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{viewClient.companyName}</h3>
                    <p className="text-[12px] text-[var(--foreground-dim)]">{viewClient.contactName}</p>
                  </div>
                </div>
                <button onClick={() => setViewClient(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Email</p><p className="text-[var(--foreground)]">{viewClient.email}</p></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Phone</p><p className="text-[var(--foreground)]">{viewClient.phone || "—"}</p></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Country</p><p className="text-[var(--foreground)]">{viewClient.country || "—"}</p></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Brand</p><span className="badge" style={{ color: brandColor(viewClient.brand), backgroundColor: `${brandColor(viewClient.brand)}10` }}>{viewClient.brand}</span></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">MRR</p><p className="text-[var(--foreground)] font-medium">{formatCurrency(viewClient.mrr)}/mo</p></div>
                <div><p className="text-[11px] text-[var(--foreground-dim)] mb-0.5">Health</p><p className={clsx("font-medium", healthColor(viewClient.healthScore))}>{viewClient.healthScore}%</p></div>
              </div>
              {viewClient.services?.length > 0 && (
                <div>
                  <p className="text-[11px] text-[var(--foreground-dim)] mb-1.5">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewClient.services.map((s) => (
                      <span key={s} className="badge bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewClient.result && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[11px] text-emerald-400/70 mb-0.5">Result</p>
                  <p className="text-[13px] text-emerald-400">{viewClient.result}</p>
                </div>
              )}
            </div>
            {/* Email Thread Tab */}
            {viewClient.email && (
              <div className="border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    const el = document.getElementById("client-emails-section");
                    if (el) el.style.display = el.style.display === "none" ? "block" : "none";
                  }}
                  className="w-full flex items-center gap-2 px-5 py-3 text-[13px] font-medium text-[var(--foreground-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Mail className="w-4 h-4" /> Email History
                </button>
                <div id="client-emails-section" style={{ display: "none" }} className="px-5 pb-4">
                  <ClientEmails clientEmail={viewClient.email} />
                </div>
              </div>
            )}
            {/* Portal Access */}
            {(() => {
              const hasPortal = Boolean("portalAccess" in viewClient && (viewClient as unknown as { portalAccess?: boolean }).portalAccess);
              return (
                <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-[var(--foreground-muted)]">
                    <Globe className="w-4 h-4" /> Client Portal
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const newVal = !hasPortal;
                        await apiMutate(`/api/clients/${viewClient.id}`, "PATCH", { portalAccess: newVal });
                        setClientList((prev) => prev.map((c) => c.id === viewClient.id ? { ...c } : c));
                        setViewClient(null);
                        success(newVal ? "Portal access enabled" : "Portal access disabled");
                      }}
                      className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${hasPortal ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-[var(--surface)] text-[var(--foreground-dim)] border border-[var(--border)]"}`}
                    >
                      {hasPortal ? "Enabled" : "Disabled"}
                    </button>
                    {hasPortal && (
                      <button
                        onClick={async () => {
                          const res = await apiMutate<{ loginUrl?: string }>("/api/portal/invite", "POST", { clientId: viewClient.id });
                          if (res.ok) {
                            success("Portal invite sent to " + viewClient.email);
                          } else {
                            showError(res.error || "Failed to send invite");
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-md text-[12px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors"
                      >
                        <Send className="w-3 h-3" /> Send Invite
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* AI Brief */}
            <div className="border-t border-[var(--border)] px-5 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] text-[var(--foreground-muted)]">
                  <Sparkles className="w-4 h-4 text-[var(--primary)]" /> AI Executive Brief
                </div>
                <div className="flex items-center gap-1">
                  {briefText && (
                    <button onClick={copyBrief} className="btn-ghost p-1.5" title="Copy">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerateBrief(viewClient.id)}
                    disabled={briefLoading}
                    className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {briefLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {briefLoading ? "Generating…" : briefText ? "Regenerate" : "Generate Brief"}
                  </button>
                </div>
              </div>
              {briefText && (
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[12px] text-[var(--foreground-muted)] leading-relaxed whitespace-pre-wrap">
                  {briefText}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
              <button onClick={() => { setViewClient(null); setBriefText(null); openEdit(viewClient); }} className="btn-secondary"><Edit className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => { setViewClient(null); setBriefText(null); }} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full max-w-lg max-h-[80vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{editingId ? "Edit Client" : "New Client"}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Company Name *</label>
                  <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Acme Corp" className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Contact Person *</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="John Smith" className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@acme.com" className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0123" className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Brand</label>
                  <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field">
                    {brands.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Country</label>
                  <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field">
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Monthly Revenue ($)</label>
                  <input type="number" value={form.mrr || ""} onChange={(e) => setForm({ ...form, mrr: Number(e.target.value) })} placeholder="5000" className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Health Score (0-100)</label>
                  <input type="number" min={0} max={100} value={form.healthScore} onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })} className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Last Contact</label>
                  <input type="date" value={form.lastContactDate} onChange={(e) => setForm({ ...form, lastContactDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Next Follow-Up</label>
                  <input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Services</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.services.map((s) => (
                    <span key={s} className="badge bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">
                      {s}
                      <button onClick={() => setForm({ ...form, services: form.services.filter((x) => x !== s) })} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text" value={newService} onChange={(e) => setNewService(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newService.trim()) { setForm({ ...form, services: [...form.services, newService.trim()] }); setNewService(""); } } }}
                  placeholder="Add service + Enter" className="input-field"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingId ? "Save" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-2">Remove Client</h3>
            <p className="text-[13px] text-[var(--foreground-muted)] mb-5">
              Remove <strong className="text-[var(--foreground)]">{clientList.find((c) => c.id === showDeleteConfirm)?.companyName}</strong>? This cannot be undone.
            </p>
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
