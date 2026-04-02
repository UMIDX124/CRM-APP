"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield, Clock, User, Building2, CheckSquare, FileText, LogIn, LogOut,
  Download, Search, Filter, RefreshCw, ChevronDown, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

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
  user: { firstName: string; lastName: string; email: string };
}

const actionColors: Record<string, { bg: string; color: string; icon: typeof Shield }> = {
  CREATE: { bg: "bg-emerald-500/10", color: "text-emerald-400", icon: CheckSquare },
  UPDATE: { bg: "bg-cyan-500/10", color: "text-cyan-400", icon: RefreshCw },
  DELETE: { bg: "bg-red-500/10", color: "text-red-400", icon: AlertTriangle },
  LOGIN: { bg: "bg-[#FF6B00]/10", color: "text-[#FF6B00]", icon: LogIn },
  LOGOUT: { bg: "bg-white/5", color: "text-white/50", icon: LogOut },
  EXPORT: { bg: "bg-purple-500/10", color: "text-purple-400", icon: Download },
};

const entityIcons: Record<string, typeof User> = {
  User: User, Client: Building2, Task: CheckSquare, Invoice: FileText, Lead: Building2,
  Email: FileText, Attendance: Clock,
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/audit?limit=100")
      .then((r) => r.ok ? r.json() : [])
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction !== "ALL" && l.action !== filterAction) return false;
      if (filterEntity !== "ALL" && l.entity !== filterEntity) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${l.user.firstName} ${l.user.lastName}`.toLowerCase();
        if (!name.includes(q) && !l.entity.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterEntity, search]);

  const entities = [...new Set(logs.map((l) => l.entity))];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[#FF6B00]" />
            <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
          </div>
          <p className="text-sm text-white/40">Complete log of every action in the system</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetch("/api/audit?limit=100").then(r => r.json()).then(setLogs).finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search by user or entity..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Actions</option>
          {Object.keys(actionColors).map((a) => <option key={a} value={a} className="bg-[#0f0f1e]">{a}</option>)}
        </select>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Entities</option>
          {entities.map((e) => <option key={e} value={e} className="bg-[#0f0f1e]">{e}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{logs.length === 0 ? "No audit logs yet — actions will appear here as users interact with the CRM" : "No logs match your filters"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const cfg = actionColors[log.action] || actionColors.CREATE;
            const Icon = cfg.icon;
            const EntityIcon = entityIcons[log.entity] || Shield;
            return (
              <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                  <Icon className={clsx("w-5 h-5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{log.user.firstName} {log.user.lastName}</span>
                    <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold", cfg.bg, cfg.color)}>{log.action}</span>
                    <span className="text-sm text-white/50">{log.entity}</span>
                  </div>
                  {log.changes && (
                    <p className="text-xs text-white/30 mt-1 truncate font-mono">
                      {JSON.stringify(log.changes).substring(0, 120)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(log.createdAt)}</span>
                    {log.ipAddress && <span>{log.ipAddress}</span>}
                    <span className="font-mono">{log.entityId.substring(0, 8)}</span>
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
