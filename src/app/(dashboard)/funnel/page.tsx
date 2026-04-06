"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Users, DollarSign, Target, ArrowRight,
  Filter, Building2, Mail, Phone, Calendar, Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/types";
import { useCompany } from "@/components/CompanyContext";

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

interface FunnelLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: string;
  value: number;
  score: number;
  source: string;
  brand: string | null;
  brandColor: string | null;
  createdAt: string;
  notes: string | null;
}

interface FunnelData {
  total: number;
  funnel: FunnelStage[];
  leads: FunnelLead[];
  sourceBreakdown: { name: string; count: number }[];
  metrics: {
    totalValue: number;
    wonValue: number;
    avgScore: number;
    conversionRate: number;
  };
}

const brandColors: Record<string, string> = { VCS: "#FF6B00", BSL: "#3B82F6", DPL: "#22C55E" };

export default function FunnelPage() {
  const { activeCompany } = useCompany();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    // Local filter takes precedence; otherwise scope to global active company
    if (sourceFilter !== "ALL") params.set("source", sourceFilter);
    else params.set("brand", activeCompany.code);
    params.set("days", String(daysFilter));

    fetch(`/api/funnel?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && !d.error) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sourceFilter, daysFilter, activeCompany.code]);

  const funnel = data?.funnel || [];
  const leads = data?.leads || [];
  const metrics = data?.metrics || { totalValue: 0, wonValue: 0, avgScore: 0, conversionRate: 0 };
  const maxCount = Math.max(...funnel.map(s => s.count), 1);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#EF4444";
    if (score >= 60) return "#F59E0B";
    if (score >= 40) return "#3B82F6";
    return "#71717A";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "URGENT";
    if (score >= 60) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  };

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Lead Funnel</h2>
          <p className="page-subtitle">Track conversion across all websites</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="input-field w-auto text-[12px]"
          >
            <option value="ALL">All Sources</option>
            <option value="DPL">DPL</option>
            <option value="VCS">VCS</option>
            <option value="BSL">BSL</option>
          </select>
          <div className="tab-list">
            {[{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDaysFilter(opt.value)}
                className={`tab-item ${daysFilter === opt.value ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: String(data?.total || 0), icon: Users, color: "#3B82F6" },
          { label: "Pipeline Value", value: formatCurrency(metrics.totalValue, true), icon: DollarSign, color: "#6366F1" },
          { label: "Won Revenue", value: formatCurrency(metrics.wonValue, true), icon: TrendingUp, color: "#10B981" },
          { label: "Win Rate", value: `${metrics.conversionRate}%`, icon: Target, color: "#F59E0B" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}12` }}>
                <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-[10px] font-medium text-[var(--foreground-dim)] uppercase tracking-wider">{kpi.label}</p>
            <p className="text-[22px] font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
              {loading ? <span className="skeleton inline-block h-7 w-20" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Visual Funnel */}
      <div className="card-glow p-6">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-5">Conversion Funnel</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {funnel.map((stage, i) => {
              const pct = Math.round((stage.count / maxCount) * 100);
              const convFromPrev = i > 0 && funnel[i - 1].count > 0
                ? Math.round((stage.count / funnel[i - 1].count) * 100)
                : 100;
              return (
                <div key={stage.stage} className="group">
                  <div className="flex items-center gap-4">
                    <div className="w-[90px] shrink-0">
                      <p className="text-[12px] font-medium text-[var(--foreground-muted)]">{stage.stage}</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-8 rounded-lg bg-[var(--surface-hover)] overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-700 flex items-center px-3"
                          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: `${stage.color}20` }}
                        >
                          <span className="text-[12px] font-semibold tabular-nums" style={{ color: stage.color }}>{stage.count}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-[80px] text-right shrink-0">
                      <p className="text-[12px] font-medium text-[var(--foreground)] tabular-nums">{formatCurrency(stage.value, true)}</p>
                    </div>
                    {i > 0 && (
                      <div className="w-[50px] text-right shrink-0">
                        <span className="text-[10px] tabular-nums" style={{ color: convFromPrev >= 50 ? "#10B981" : convFromPrev >= 25 ? "#F59E0B" : "#EF4444" }}>
                          {convFromPrev}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Source Breakdown + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source breakdown */}
        <div className="card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">By Source</h3>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-6 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {(data?.sourceBreakdown || []).map(src => {
                const color = brandColors[src.name] || "#6366F1";
                const pct = (data?.total || 1) > 0 ? Math.round((src.count / (data?.total || 1)) * 100) : 0;
                return (
                  <div key={src.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[12px] text-[var(--foreground-muted)]">{src.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">{src.count}</span>
                        <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {(data?.sourceBreakdown || []).length === 0 && (
                <p className="text-[12px] text-[var(--foreground-dim)] text-center py-4">No leads yet</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-2 card-glow p-5">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight mb-4">Recent Leads</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
          ) : leads.length === 0 ? (
            <div className="empty-state py-12">
              <Users className="w-8 h-8 text-[var(--foreground-dim)] mb-3" />
              <p className="text-[13px] text-[var(--foreground-dim)]">No leads in this period</p>
              <p className="text-[11px] text-[var(--foreground-dim)] mt-1">Leads from website forms will appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {leads.slice(0, 10).map(lead => {
                const scoreColor = getScoreColor(lead.score || 0);
                const brandColor = lead.brandColor || brandColors[lead.brand || ""] || "#6366F1";
                return (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
                    >
                      {lead.companyName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{lead.companyName}</p>
                        {lead.brand && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                            {lead.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[var(--foreground-dim)]">{lead.contactName}</span>
                        <span className="text-[11px] text-[var(--foreground-dim)]">&middot;</span>
                        <span className="text-[11px] text-[var(--foreground-dim)]">{daysSince(lead.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {lead.value > 0 && (
                        <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(lead.value, true)}</span>
                      )}
                      <span
                        className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}
                      >
                        {getScoreLabel(lead.score || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
