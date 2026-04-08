"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, X, CheckCheck, Clock, DollarSign, UserPlus, AlertTriangle,
  Trophy, Zap, Briefcase, CheckSquare, Users, Building2, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { useEventStream, type StreamNotification } from "@/hooks/useEventStream";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  LEAD_NEW: { icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10" },
  LEAD_ASSIGNED: { icon: UserPlus, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  LEAD_STATUS: { icon: Briefcase, color: "text-amber-400", bg: "bg-amber-500/10" },
  CLIENT_ADDED: { icon: Building2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  CLIENT_DELETED: { icon: Building2, color: "text-red-400", bg: "bg-red-500/10" },
  CLIENT_HEALTH: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  INVOICE_PAID: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  INVOICE_OVERDUE: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  TASK_ASSIGNED: { icon: CheckSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  TASK_STATUS: { icon: CheckSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  TASK_DUE: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
  TEAM_UPDATE: { icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  MENTION: { icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10" },
  SYSTEM: { icon: Zap, color: "text-[var(--foreground-dim)]", bg: "bg-[var(--surface-hover)]" },
  lead: { icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10" },
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

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  // hydrated = we have at least one /api/notifications response back
  // (used for the cold-start skeleton)
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setError(null);
        }
      } else if (res.status === 401) {
        // Not logged in — ignore silently
      } else {
        setError("Failed to load");
      }
    } catch {
      // Network error — don't show error for background polls
    } finally {
      setHydrated(true);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Live SSE via local EventSource. (We could route through RealtimeProvider
  // but NotificationCenter is rendered inside the dashboard layout — both
  // work; this keeps the bell self-contained on routes that don't mount
  // the provider.)
  useEventStream({
    onNotification: (n) => {
      if (!n) {
        void fetchNotifications();
        return;
      }
      setNotifications((prev) => {
        if (prev.some((p) => p.id === n.id)) return prev;
        return [n as Notification, ...prev].slice(0, 50);
      });
    },
  });

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      console.error("Failed to mark all read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      console.error("Failed to mark read");
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) {
        setNotifications([]);
      }
    } catch {
      console.error("Failed to clear notifications");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-all"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[360px] max-h-[480px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-semibold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--surface-hover)]">
                  <CheckCheck className="w-3 h-3" /> Read all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px] scrollbar-thin">
            {!hydrated ? (
              // Cold-start skeleton — shown until first /api/notifications response
              <div className="px-4 py-3 space-y-3" aria-label="Loading notifications">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 skeleton rounded" style={{ width: `${70 - i * 8}%` }} />
                      <div className="h-2.5 skeleton rounded" style={{ width: `${85 - i * 5}%` }} />
                      <div className="h-2 skeleton rounded w-12 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[var(--foreground-dim)] animate-spin" />
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-[12px] text-[var(--foreground-dim)]">{error}</p>
                <button onClick={() => fetchNotifications()} className="text-[11px] text-[var(--primary)] mt-2 hover:underline">Retry</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-6 h-6 text-[var(--foreground-dim)] mx-auto mb-2 opacity-30" />
                <p className="text-[12px] text-[var(--foreground-dim)]">All caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = typeConfig[notif.type] || typeConfig.SYSTEM;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && markRead(notif.id)}
                    className={clsx(
                      "flex gap-3 px-4 py-3 border-b border-[var(--border-subtle)] cursor-pointer transition-colors",
                      notif.isRead ? "hover:bg-[var(--surface-hover)]" : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                      <Icon className={clsx("w-3.5 h-3.5", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={clsx("text-[12px] font-medium truncate", notif.isRead ? "text-[var(--foreground-muted)]" : "text-[var(--foreground)]")}>
                          {notif.title}
                        </p>
                        {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[var(--foreground-dim)] mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-[10px] text-[var(--foreground-dim)] mt-1 inline-block">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Clear all */}
          {notifications.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-2 flex items-center justify-end">
              <button
                onClick={clearAll}
                className="text-[11px] text-[var(--foreground-dim)] hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/5"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
