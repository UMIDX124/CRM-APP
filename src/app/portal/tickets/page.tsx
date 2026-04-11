"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Ticket, Plus, Loader2, AlertCircle, Clock, CheckCircle2,
  XCircle, MessageSquare, ChevronDown, X, Send,
} from "lucide-react";
import { clsx } from "clsx";

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  channel: string;
  assignee: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  OPEN: { bg: "bg-blue-500/10", text: "text-blue-400", icon: Clock },
  IN_PROGRESS: { bg: "bg-amber-500/10", text: "text-amber-400", icon: Loader2 },
  WAITING_CUSTOMER: { bg: "bg-purple-500/10", text: "text-purple-400", icon: MessageSquare },
  RESOLVED: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle2 },
  CLOSED: { bg: "bg-[var(--surface-hover)]", text: "text-[var(--foreground-dim)]", icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-[var(--foreground-dim)]",
  MEDIUM: "text-blue-400",
  HIGH: "text-amber-400",
  CRITICAL: "text-red-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "MEDIUM" });
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/tickets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    if (!form.subject.trim()) { setCreateError("Subject is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setCreateError(data.error || "Failed to create ticket");
        return;
      }
      setForm({ subject: "", description: "", priority: "MEDIUM" });
      setShowCreate(false);
      fetchTickets();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Support Tickets</h1>
          <p className="text-sm text-[var(--foreground-dim)] mt-0.5">
            {openCount} open &middot; {resolvedCount} resolved
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">New Support Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="input-field"
                  maxLength={300}
                />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide details about your issue..."
                  rows={4}
                  className="input-field resize-none"
                  maxLength={5000}
                />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="input-field"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              {createError && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {createError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary disabled:opacity-50">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-[13px] text-red-400">{error}</p>
          <button onClick={fetchTickets} className="btn-secondary mt-3 text-[12px]">Retry</button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state py-16">
          <Ticket className="w-10 h-10 text-[var(--foreground-dim)] mb-3 opacity-40" />
          <p className="text-[14px] text-[var(--foreground-muted)]">No tickets yet</p>
          <p className="text-[12px] text-[var(--foreground-dim)] mt-1">
            Submit a support ticket and we&apos;ll get back to you quickly.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN;
            const StatusIcon = style.icon;
            const prioColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.MEDIUM;
            return (
              <div
                key={ticket.id}
                className="card p-4 hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", style.bg)}>
                    <StatusIcon className={clsx("w-4 h-4", style.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{ticket.subject}</p>
                      <span className={clsx("text-[10px] font-semibold px-1.5 py-0.5 rounded", style.bg, style.text)}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                      <span className={clsx("text-[10px] font-medium", prioColor)}>
                        {ticket.priority}
                      </span>
                    </div>
                    {ticket.description && (
                      <p className="text-[12px] text-[var(--foreground-dim)] mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--foreground-dim)]">
                      <span>{timeAgo(ticket.createdAt)}</span>
                      {ticket.assignee && <span>Assigned to {ticket.assignee}</span>}
                      {ticket.commentCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" /> {ticket.commentCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
