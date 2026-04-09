"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  X,
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Tag,
  User,
  Send,
  Star,
  FileText,
} from "lucide-react";
import { useCompany } from "@/components/CompanyContext";

type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; avatar: string | null };
}

interface Ticket {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: string;
  tags: string[];
  brand: { code: string; color: string } | null;
  client: { id: string; companyName: string } | null;
  requester: { id: string; firstName: string; lastName: string; email: string } | null;
  assignee: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
  comments?: TicketComment[];
  _count?: { comments: number };
  firstResponseAt: string | null;
  resolvedAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  csatRating: number | null;
  csatComment: string | null;
  csatSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; bg: string }
> = {
  OPEN: { label: "Open", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  IN_PROGRESS: { label: "In Progress", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  WAITING_CUSTOMER: {
    label: "Waiting",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
  },
  RESOLVED: { label: "Resolved", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  CLOSED: { label: "Closed", color: "#71717A", bg: "rgba(113,113,122,0.12)" },
};

const PRIORITY_META: Record<TicketPriority, { color: string; label: string }> = {
  LOW: { color: "#71717A", label: "Low" },
  MEDIUM: { color: "#3B82F6", label: "Medium" },
  HIGH: { color: "#F59E0B", label: "High" },
  URGENT: { color: "#EF4444", label: "Urgent" },
};

export default function TicketsModule() {
  const { activeCompany } = useCompany();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "ALL">(
    "ALL"
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCompany.code !== "FU") params.set("brand", activeCompany.code);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
    if (search) params.set("q", search);
    try {
      const res = await fetch(`/api/tickets?${params}`);
      if (res.ok) setTickets(await res.json());
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [activeCompany.code, statusFilter, priorityFilter, search]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const counts = useMemo(() => {
    const c = { OPEN: 0, IN_PROGRESS: 0, WAITING_CUSTOMER: 0, RESOLVED: 0, CLOSED: 0 };
    for (const t of tickets) c[t.status]++;
    return c;
  }, [tickets]);

  const breachedCount = tickets.filter((t) => t.slaBreached).length;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Tickets</h2>
          <p className="page-subtitle">Customer support inbox</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="input-field pl-8 text-[12px] w-[220px]"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary text-[12px] gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Open",
            value: String(counts.OPEN + counts.IN_PROGRESS + counts.WAITING_CUSTOMER),
            icon: Inbox,
            color: "#3B82F6",
          },
          {
            label: "SLA Breached",
            value: String(breachedCount),
            icon: AlertCircle,
            color: "#EF4444",
          },
          {
            label: "Awaiting Response",
            value: String(counts.WAITING_CUSTOMER),
            icon: Clock,
            color: "#06B6D4",
          },
          {
            label: "Resolved",
            value: String(counts.RESOLVED + counts.CLOSED),
            icon: CheckCircle2,
            color: "#10B981",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="kpi-card animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${kpi.color}12` }}
              >
                <kpi.icon
                  className="w-[18px] h-[18px]"
                  style={{ color: kpi.color }}
                />
              </div>
            </div>
            <p className="text-[10px] font-medium text-[var(--foreground-dim)] uppercase tracking-wider">
              {kpi.label}
            </p>
            <p className="text-[22px] font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
              {loading ? <span className="skeleton inline-block h-7 w-12" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="tab-list">
          {(["ALL", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`tab-item ${statusFilter === s ? "active" : ""}`}
              >
                {s === "ALL" ? "All" : STATUS_META[s as TicketStatus].label}
              </button>
            )
          )}
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "ALL")}
          className="input-field w-auto text-[12px]"
        >
          <option value="ALL">All priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Ticket list */}
      <div className="card-glow overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state py-16">
            <Inbox className="w-10 h-10 text-[var(--foreground-dim)] mb-3" />
            <p className="text-[13px] text-[var(--foreground-dim)]">No tickets found</p>
            <p className="text-[11px] text-[var(--foreground-dim)] mt-1">
              Create your first ticket to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tickets.map((t) => {
              const status = STATUS_META[t.status];
              const priority = PRIORITY_META[t.priority];
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-[var(--surface-hover)] transition-colors text-left"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: priority.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">
                        #{t.number}
                      </span>
                      <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                        {t.subject}
                      </p>
                      {t.brand && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{
                            backgroundColor: `${t.brand.color}15`,
                            color: t.brand.color,
                          }}
                        >
                          {t.brand.code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--foreground-dim)] line-clamp-1">
                      {t.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                      <span
                        className="text-[9px] font-semibold uppercase"
                        style={{ color: priority.color }}
                      >
                        {priority.label}
                      </span>
                      {t.slaBreached && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase bg-red-500/15 text-red-500 animate-pulse">
                          SLA BREACH
                        </span>
                      )}
                      {t._count && t._count.comments > 0 && (
                        <span className="text-[10px] text-[var(--foreground-dim)] flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {t._count.comments}
                        </span>
                      )}
                      {t.client && (
                        <span className="text-[10px] text-[var(--foreground-dim)] truncate">
                          {t.client.companyName}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--foreground-dim)] ml-auto">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {t.assignee && (
                    <div
                      className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                      title={`${t.assignee.firstName} ${t.assignee.lastName}`}
                    >
                      {t.assignee.firstName[0]}
                      {t.assignee.lastName[0]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {createOpen && (
        <CreateTicketModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void fetchTickets();
          }}
        />
      )}

      {openTicket && (
        <TicketDetailModal
          ticket={openTicket}
          onClose={() => setOpenTicket(null)}
          onUpdated={() => {
            setOpenTicket(null);
            void fetchTickets();
          }}
        />
      )}
    </div>
  );
}

function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [channel, setChannel] = useState("WEB");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          priority,
          channel,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create ticket");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
            New Ticket
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Subject *
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field w-full text-[12px]"
              placeholder="Brief summary of the issue"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full text-[12px] resize-none"
              rows={5}
              placeholder="Full details of the request"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="input-field w-full text-[12px]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="input-field w-full text-[12px]"
              >
                <option value="WEB">Web</option>
                <option value="EMAIL">Email</option>
                <option value="CHAT">Chat</option>
                <option value="PHONE">Phone</option>
                <option value="API">API</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="text-[11px] text-[var(--danger)] bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-[12px]"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-[12px]"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CannedTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string | null;
}

function TicketDetailModal({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [full, setFull] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // CSAT local state
  const [csatRating, setCsatRating] = useState<number>(0);
  const [csatComment, setCsatComment] = useState("");
  const [csatSubmitting, setCsatSubmitting] = useState(false);
  const [csatError, setCsatError] = useState<string | null>(null);
  // Templates
  const [templates, setTemplates] = useState<CannedTemplate[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`);
      if (res.ok) setFull(await res.json());
    } catch {
      // ignore
    }
  }, [ticket.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Load templates once on mount
  useEffect(() => {
    fetch("/api/ticket-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {});
  }, []);

  const submitCsat = async () => {
    if (!csatRating) return;
    setCsatSubmitting(true);
    setCsatError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/csat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: csatRating,
          comment: csatComment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCsatError(data.error || "Submission failed");
      } else {
        await reload();
      }
    } catch {
      setCsatError("Network error");
    } finally {
      setCsatSubmitting(false);
    }
  };

  const applyTemplate = (tpl: CannedTemplate) => {
    setReply((prev) => (prev ? `${prev}\n\n${tpl.body}` : tpl.body));
    setTemplatesOpen(false);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), isInternal }),
      });
      if (res.ok) {
        setReply("");
        await reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status: TicketStatus) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await reload();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ticket #${ticket.number}? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
      if (res.ok) onUpdated();
    } catch {
      // ignore
    }
  };

  const t = full || ticket;
  const status = STATUS_META[t.status];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-[var(--foreground-dim)] tabular-nums">
                #{t.number}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                {status.label}
              </span>
              <span
                className="text-[10px] font-semibold uppercase"
                style={{ color: PRIORITY_META[t.priority].color }}
              >
                {PRIORITY_META[t.priority].label}
              </span>
            </div>
            <h3 className="text-[17px] font-semibold text-[var(--foreground)]">
              {t.subject}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-2 bg-[var(--background)]">
          <span className="text-[10px] text-[var(--foreground-dim)] uppercase">
            Status:
          </span>
          {(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`text-[10px] px-2 py-1 rounded font-semibold uppercase transition-colors ${
                  t.status === s
                    ? "ring-1"
                    : "hover:bg-[var(--surface-hover)]"
                }`}
                style={{
                  backgroundColor: t.status === s ? STATUS_META[s].bg : "transparent",
                  color: STATUS_META[s].color,
                }}
              >
                {STATUS_META[s].label}
              </button>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-[12px] text-[var(--foreground-muted)] whitespace-pre-wrap">
            {t.description}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--foreground-dim)]">
            {t.requester && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {t.requester.firstName}{" "}
                {t.requester.lastName}
              </span>
            )}
            {t.client && <span>· {t.client.companyName}</span>}
            <span>· {new Date(t.createdAt).toLocaleString()}</span>
            {t.tags && t.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" /> {t.tags.join(", ")}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider">
              Conversation
            </p>
            {(t.comments || []).length === 0 ? (
              <p className="text-[11px] text-[var(--foreground-dim)] italic">
                No replies yet
              </p>
            ) : (
              (t.comments || []).map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border ${
                    c.isInternal
                      ? "bg-yellow-500/5 border-yellow-500/20"
                      : "bg-[var(--background)] border-[var(--border)]"
                  }`}
                  data-ticket-comment={c.id}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center text-[9px] font-semibold text-white">
                      {c.author.firstName[0]}
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">
                      {c.author.firstName} {c.author.lastName}
                    </span>
                    {c.isInternal && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-semibold">
                        INTERNAL
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--foreground-dim)] ml-auto">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--foreground-muted)] whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* CSAT — rating widget shown only for resolved/closed tickets */}
          {(t.status === "RESOLVED" || t.status === "CLOSED") && (
            <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/30">
              {t.csatSubmittedAt ? (
                <div>
                  <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-2">
                    Customer satisfaction
                  </p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className="w-4 h-4"
                        fill={n <= (t.csatRating || 0) ? "#F59E0B" : "none"}
                        stroke={n <= (t.csatRating || 0) ? "#F59E0B" : "var(--foreground-dim)"}
                      />
                    ))}
                    <span className="text-[11px] text-[var(--foreground-muted)] ml-1">
                      {t.csatRating}/5
                    </span>
                    <span className="text-[10px] text-[var(--foreground-dim)] ml-auto">
                      {new Date(t.csatSubmittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {t.csatComment && (
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-2 italic">
                      &ldquo;{t.csatComment}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-medium text-[var(--foreground)] mb-1">
                    How was your experience?
                  </p>
                  <p className="text-[10px] text-[var(--foreground-dim)] mb-3">
                    Rate the support you received — this helps the team improve.
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCsatRating(n)}
                        className="p-1 hover:scale-110 transition-transform"
                        aria-label={`${n} stars`}
                      >
                        <Star
                          className="w-5 h-5"
                          fill={n <= csatRating ? "#F59E0B" : "none"}
                          stroke={n <= csatRating ? "#F59E0B" : "var(--foreground-dim)"}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={csatComment}
                    onChange={(e) => setCsatComment(e.target.value)}
                    placeholder="Optional comment…"
                    className="input-field w-full text-[11px] resize-none mb-2"
                    rows={2}
                    maxLength={1000}
                  />
                  {csatError && (
                    <p className="text-[10px] text-red-400 mb-2">{csatError}</p>
                  )}
                  <button
                    onClick={submitCsat}
                    disabled={!csatRating || csatSubmitting}
                    className="btn-primary text-[11px] w-full disabled:opacity-50"
                  >
                    {csatSubmitting ? "Submitting…" : "Submit rating"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] space-y-2 relative">
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTemplatesOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
              >
                <FileText className="w-3 h-3" /> Use template ({templates.length})
              </button>
              {templatesOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated,var(--surface))] shadow-xl max-h-60 overflow-auto z-10">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] border-b border-[var(--border-subtle,var(--border))] last:border-0"
                    >
                      <p className="text-[11px] font-medium text-[var(--foreground)]">{tpl.name}</p>
                      {tpl.category && (
                        <p className="text-[9px] text-[var(--foreground-dim)] uppercase tracking-wider">
                          {tpl.category}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--foreground-dim)] line-clamp-2 mt-0.5">
                        {tpl.body.slice(0, 120)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            className="input-field w-full text-[12px] resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] text-[var(--foreground-dim)] cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal note (not visible to customer)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="text-[11px] text-[var(--danger)] hover:underline mr-2"
              >
                Delete
              </button>
              <button
                onClick={sendReply}
                disabled={submitting || !reply.trim()}
                className="btn-primary text-[12px] gap-1.5"
              >
                <Send className="w-3 h-3" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
