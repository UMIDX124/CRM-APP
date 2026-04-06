"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield, Clock, User, Building2, CheckSquare, FileText, LogIn, LogOut,
  Download, Search, RefreshCw, AlertTriangle, Briefcase,
} from "lucide-react";
import { clsx } from "clsx";

interface AuditUser {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: AuditUser | null;
}

const actionColors: Record<string, { bg: string; color: string; icon: typeof Shield }> = {
  CREATE: { bg: "bg-emerald-500/10", color: "text-emerald-400", icon: CheckSquare },
  UPDATE: { bg: "bg-cyan-500/10", color: "text-cyan-400", icon: RefreshCw },
  DELETE: { bg: "bg-red-500/10", color: "text-red-400", icon: AlertTriangle },
  LOGIN: { bg: "bg-[var(--primary)]/10", color: "text-[var(--primary)]", icon: LogIn },
  LOGOUT: { bg: "bg-[var(--surface-hover)]", color: "text-[var(--foreground-dim)]", icon: LogOut },
  EXPORT: { bg: "bg-amber-500/10", color: "text-amber-400", icon: Download },
};

const entityIcons: Record<string, typeof User> = {
  User: User,
  Client: Building2,
  Task: CheckSquare,
  Invoice: FileText,
  Lead: Briefcase,
  Email: FileText,
  Attendance: Clock,
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    fetch("/api/audit?limit=100")
      .then((r) => {
        if (r.status === 403) {
          setError("You don't have permission to view audit logs");
          return [];
        }
        if (!r.ok) {
          setError("Failed to load audit logs");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
        else setLogs([]);
      })
      .catch(() => {
        setError("Network error while loading audit logs");
        setLogs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction !== "ALL" && l.action !== filterAction) return false;
      if (filterEntity !== "ALL" && l.entity !== filterEntity) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = l.user
          ? `${l.user.firstName || ""} ${l.user.lastName || ""}`.toLowerCase()
          : "system";
        if (
          !name.includes(q) &&
          !l.entity.toLowerCase().includes(q) &&
          !l.action.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterEntity, search]);

  const entities = Array.from(new Set(logs.map((l) => l.entity)));

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const displayName = (user: AuditUser | null, userId: string) => {
    if (!user) return userId === "system" ? "System" : "Unknown";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return name || user.email || "Unknown";
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="page-title">Audit Trail</h2>
          </div>
          <p className="page-subtitle">Complete log of every action in the system</p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user, entity, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input-field w-auto"
        >
          <option value="ALL">All Actions</option>
          {Object.keys(actionColors).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="input-field w-auto"
        >
          <option value="ALL">All Entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-red-400">{error}</p>
          </div>
          <button onClick={fetchLogs} className="btn-secondary text-[11px]">Retry</button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="empty-state">
          <Shield className="w-10 h-10 text-[var(--foreground-dim)] mb-3 opacity-40" />
          <p className="text-[13px] text-[var(--foreground-dim)]">
            {logs.length === 0
              ? "No audit logs yet — actions will appear here as users interact with the CRM"
              : "No logs match your filters"}
          </p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((log) => {
            const cfg = actionColors[log.action] || actionColors.CREATE;
            const Icon = cfg.icon;
            const EntityIcon = entityIcons[log.entity] || Shield;
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
              >
                <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                  <Icon className={clsx("w-5 h-5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--foreground)]">
                      {displayName(log.user, log.userId)}
                    </span>
                    <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold", cfg.bg, cfg.color)}>
                      {log.action}
                    </span>
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--foreground-muted)]">
                      <EntityIcon className="w-3.5 h-3.5" />
                      <span>{log.entity}</span>
                    </div>
                  </div>
                  {log.changes && (
                    <p className="text-[11px] text-[var(--foreground-dim)] mt-1 truncate font-mono">
                      {JSON.stringify(log.changes).substring(0, 120)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--foreground-dim)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(log.createdAt)}
                    </span>
                    {log.ipAddress && <span>{log.ipAddress}</span>}
                    {log.entityId && (
                      <span className="font-mono">{log.entityId.substring(0, 8)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
