"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Phone,
  Globe,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Lead {
  id: string;
  siteId: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  page: string | null;
  source: string | null;
  aiScore: "hot" | "warm" | "cold" | null;
  status: string;
  createdAt: string;
  site: { name: string; domain: string };
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUSES = ["all", "new", "contacted", "qualified", "closed"] as const;
type StatusFilter = (typeof STATUSES)[number];

const LIMIT = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreBadge(score: Lead["aiScore"]) {
  switch (score) {
    case "hot":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          <span aria-hidden>&#128308;</span> Hot
        </span>
      );
    case "warm":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
          <span aria-hidden>&#128993;</span> Warm
        </span>
      );
    case "cold":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
          <span aria-hidden>&#128309;</span> Cold
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700/40 text-zinc-400">
          Unscored
        </span>
      );
  }
}

function suggestedFollowUp(score: Lead["aiScore"]): string {
  switch (score) {
    case "hot":
      return "URGENT: This lead shows strong buying signals. Reach out within the hour with a personalized demo offer. Reference their specific inquiry and propose a 15-minute call today. Every minute counts -- hot leads cool fast.";
    case "warm":
      return "NURTURE: Send a tailored email highlighting how your solution addresses their stated needs. Include a relevant case study and a soft CTA for a discovery call next week. Follow up in 3 days if no response.";
    case "cold":
      return "NEWSLETTER: Add this contact to your monthly newsletter and educational drip campaign. They are early-stage -- provide value through content (blog posts, whitepapers) and revisit in 30 days for re-scoring.";
    default:
      return "REVIEW: This lead has not been scored yet. Review their message and engagement data to assign a score, then follow the appropriate playbook.";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildCsv(leads: Lead[]): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Site",
    "Domain",
    "Page",
    "Source",
    "AI Score",
    "Status",
    "Message",
    "Date",
  ];
  const escape = (v: string | null | undefined) => {
    if (!v) return "";
    const s = v.replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s}"`
      : s;
  };
  const rows = leads.map((l) =>
    [
      escape(l.name),
      escape(l.email),
      escape(l.phone),
      escape(l.site?.name),
      escape(l.site?.domain),
      escape(l.page),
      escape(l.source),
      escape(l.aiScore),
      escape(l.status),
      escape(l.message),
      escape(l.createdAt),
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(leads: Lead[]) {
  const csv = buildCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `web-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WebLeadsPage() {
  /* ---- state ---- */
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [sites, setSites] = useState<Site[]>([]);
  const [siteFilter, setSiteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- debounce search ---- */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  /* ---- fetch sites ---- */
  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) {
        const data: Site[] = await res.json();
        setSites(data);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  /* ---- fetch leads ---- */
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (siteFilter) params.set("siteId", siteFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(currentPage));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/web-leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [siteFilter, statusFilter, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  /* ---- patch status ---- */
  async function handleStatusChange(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/web-leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }
    } catch {
      alert("Failed to update lead status. Please try again.");
    }
  }

  /* ---- reset filters ---- */
  function resetFilters() {
    setSiteFilter("");
    setStatusFilter("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  }

  /* ---- skeleton ---- */
  if (loading && leads.length === 0) {
    return (
      <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
        <div className="h-10 w-64 rounded-lg bg-[var(--surface)] animate-pulse" />
        <div className="h-12 rounded-lg bg-[var(--surface)] animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[var(--surface)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const hasFilters =
    siteFilter !== "" || statusFilter !== "all" || debouncedSearch !== "";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--primary)]" />
            Web Leads
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            {total} lead{total !== 1 ? "s" : ""} captured across your sites
          </p>
        </div>
        <button
          onClick={() => downloadCsv(leads)}
          disabled={leads.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[#0A0A0F] font-semibold text-sm hover:bg-[var(--primary-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* ---- Filter Bar ---- */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Site filter */}
          <select
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none min-w-[180px]"
          >
            <option value="">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none min-w-[150px]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ---- Error ---- */}
      {error && (
        <div className="card p-4 border-red-500/30 bg-red-500/5 flex items-center justify-between">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchLeads}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider hidden md:table-cell">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider hidden lg:table-cell">
                  Site
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider hidden xl:table-cell">
                  Page
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider hidden xl:table-cell">
                  Source
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  AI Score
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && leads.length > 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-2">
                    <div className="h-1 w-full bg-[var(--primary)]/20 rounded overflow-hidden">
                      <div className="h-full w-1/3 bg-[var(--primary)] rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && leads.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-16 text-center text-[var(--foreground-muted)]"
                  >
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads found</p>
                    <p className="text-xs mt-1">
                      {hasFilters
                        ? "Try adjusting your filters"
                        : "Leads will appear here once captured from your tracked sites"}
                    </p>
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[var(--foreground)] whitespace-nowrap">
                    {lead.name || "--"}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)] whitespace-nowrap">
                    {lead.email}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)] whitespace-nowrap hidden md:table-cell">
                    {lead.phone || "--"}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)] whitespace-nowrap hidden lg:table-cell">
                    {lead.site?.name || "--"}
                  </td>
                  <td
                    className="px-4 py-3 text-[var(--foreground-dim)] whitespace-nowrap max-w-[160px] truncate hidden xl:table-cell"
                    title={lead.page || undefined}
                  >
                    {lead.page || "--"}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-dim)] whitespace-nowrap hidden xl:table-cell">
                    {lead.source || "--"}
                  </td>
                  <td className="px-4 py-3">{scoreBadge(lead.aiScore)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleStatusChange(lead.id, e.target.value)
                      }
                      className="px-2 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none cursor-pointer"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-dim)] whitespace-nowrap hidden sm:table-cell">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Pagination ---- */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--foreground-dim)]">
            Showing {(currentPage - 1) * LIMIT + 1}--
            {Math.min(currentPage * LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => {
                if (pages <= 7) return true;
                if (p === 1 || p === pages) return true;
                if (Math.abs(p - currentPage) <= 1) return true;
                return false;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-2 text-[var(--foreground-dim)] text-sm"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item as number)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item
                        ? "bg-[var(--primary)] text-[#0A0A0F]"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage >= pages}
              className="p-2 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ---- Side Panel / Drawer ---- */}
      {selectedLead && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedLead(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 z-10 bg-[var(--surface-elevated)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Lead Details
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name + Score */}
              <div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  {selectedLead.name || "Unknown"}
                </h3>
                <div className="mt-2">{scoreBadge(selectedLead.aiScore)}</div>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors break-all"
                  >
                    {selectedLead.email}
                  </a>
                </div>
                {selectedLead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                    >
                      {selectedLead.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                  <span className="text-sm text-[var(--foreground)]">
                    {selectedLead.site?.name} ({selectedLead.site?.domain})
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <p className="text-xs text-[var(--foreground-muted)] mb-1">
                    Status
                  </p>
                  <select
                    value={selectedLead.status}
                    onChange={(e) =>
                      handleStatusChange(selectedLead.id, e.target.value)
                    }
                    className="w-full px-2 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <p className="text-xs text-[var(--foreground-muted)] mb-1">
                    Captured
                  </p>
                  <p className="text-sm text-[var(--foreground)] font-medium">
                    {formatDateTime(selectedLead.createdAt)}
                  </p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <p className="text-xs text-[var(--foreground-muted)] mb-1">
                    Page
                  </p>
                  <p
                    className="text-sm text-[var(--foreground)] font-medium truncate"
                    title={selectedLead.page || undefined}
                  >
                    {selectedLead.page || "--"}
                  </p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <p className="text-xs text-[var(--foreground-muted)] mb-1">
                    Source
                  </p>
                  <p className="text-sm text-[var(--foreground)] font-medium">
                    {selectedLead.source || "--"}
                  </p>
                </div>
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div>
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                    Message
                  </p>
                  <div className="bg-[var(--surface)] rounded-lg p-4 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                    {selectedLead.message}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up */}
              <div>
                <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                  Suggested Follow-up
                </p>
                <div className="bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-lg p-4 text-sm text-[var(--foreground)] leading-relaxed">
                  {suggestedFollowUp(selectedLead.aiScore)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
