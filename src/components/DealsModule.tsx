"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import {
  Plus,
  DollarSign,
  TrendingUp,
  Target,
  Calendar,
  Search,
  X,
  Activity,
  Building2,
  User,
  Upload,
} from "lucide-react";
import { formatCurrency } from "@/lib/types";
import { useCompany } from "@/components/CompanyContext";

type DealStage =
  | "NEW"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

interface DealActivity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user?: { firstName: string; lastName: string } | null;
}

interface Deal {
  id: string;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedClose: string | null;
  followUpDate: string | null;
  stageEnteredAt: string;
  daysInStage: number;
  isStale: boolean;
  isFollowUpOverdue: boolean;
  dealScore: number;
  winReason: string | null;
  lostReason: string | null;
  brand: { code: string; color: string; name: string } | null;
  owner: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
  client: { id: string; companyName: string } | null;
  lead: { id: string; companyName: string } | null;
  activities: DealActivity[];
  _count: { activities: number };
  createdAt: string;
  updatedAt: string;
}

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "NEW", label: "New", color: "#3B82F6" },
  { id: "QUALIFICATION", label: "Qualification", color: "#06B6D4" },
  { id: "PROPOSAL", label: "Proposal", color: "#F59E0B" },
  { id: "NEGOTIATION", label: "Negotiation", color: "#6366F1" },
  { id: "CLOSED_WON", label: "Won", color: "#10B981" },
  { id: "CLOSED_LOST", label: "Lost", color: "#EF4444" },
];

export default function DealsModule() {
  const { activeCompany } = useCompany();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCompany.code !== "FU") params.set("brand", activeCompany.code);
    if (search) params.set("q", search);
    try {
      const res = await fetch(`/api/deals?${params}`);
      if (res.ok) setDeals(await res.json());
    } catch (err) {
      console.error("Failed to load deals", err);
    } finally {
      setLoading(false);
    }
  }, [activeCompany.code, search]);

  useEffect(() => {
    void fetchDeals();
  }, [fetchDeals]);

  const grouped = useMemo(() => {
    const out: Record<DealStage, Deal[]> = {
      NEW: [],
      QUALIFICATION: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      CLOSED_WON: [],
      CLOSED_LOST: [],
    };
    for (const d of deals) out[d.stage].push(d);
    return out;
  }, [deals]);

  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  // Weighted pipeline = Σ(value × probability/100), excluding closed deals
  const weightedValue = deals.reduce((s, d) => {
    if (d.stage === "CLOSED_WON" || d.stage === "CLOSED_LOST") return s;
    return s + (d.value || 0) * ((d.probability || 0) / 100);
  }, 0);
  const wonValue = grouped.CLOSED_WON.reduce((s, d) => s + (d.value || 0), 0);
  const openCount =
    deals.length - grouped.CLOSED_WON.length - grouped.CLOSED_LOST.length;
  const winRate =
    grouped.CLOSED_WON.length + grouped.CLOSED_LOST.length > 0
      ? Math.round(
          (grouped.CLOSED_WON.length /
            (grouped.CLOSED_WON.length + grouped.CLOSED_LOST.length)) *
            100
        )
      : 0;
  const staleCount = deals.filter((d) => d.isStale).length;

  const handleDrop = async (stage: DealStage) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOverStage(null);
    if (!id) return;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;

    // Win/loss gate — prompt for reason before sending
    const body: Record<string, unknown> = { stage };
    if (stage === "CLOSED_WON" && !deal.winReason) {
      const reason = window.prompt("Why was this deal won? (required)");
      if (!reason || !reason.trim()) return;
      body.winReason = reason.trim();
    }
    if (stage === "CLOSED_LOST" && !deal.lostReason) {
      const reason = window.prompt("Why was this deal lost? (required)");
      if (!reason || !reason.trim()) return;
      body.lostReason = reason.trim();
    }

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              stage,
              stageEnteredAt: new Date().toISOString(),
              daysInStage: 0,
              isStale: false,
              ...(body.winReason ? { winReason: body.winReason as string } : {}),
              ...(body.lostReason ? { lostReason: body.lostReason as string } : {}),
            }
          : d
      )
    );

    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert on failure
      setDeals((prev) =>
        prev.map((d) => (d.id === id ? { ...d, stage: deal.stage } : d))
      );
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Deals</h2>
          <p className="page-subtitle">Sales pipeline · drag cards between stages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals…"
              className="input-field pl-8 text-[12px] w-[220px]"
            />
          </div>
          <Link
            href="/deals/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-[12px] font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Link>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary text-[12px] gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Deal
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Open Deals",
            value: String(openCount),
            sub: staleCount > 0 ? `${staleCount} stale` : undefined,
            icon: Target,
            color: "#3B82F6",
          },
          {
            label: "Weighted Pipeline",
            value: formatCurrency(weightedValue, true),
            sub: `of ${formatCurrency(totalValue, true)} total`,
            icon: DollarSign,
            color: "#6366F1",
          },
          {
            label: "Won Revenue",
            value: formatCurrency(wonValue, true),
            icon: TrendingUp,
            color: "#10B981",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            icon: Activity,
            color: "#F59E0B",
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
              {loading ? <span className="skeleton inline-block h-7 w-20" /> : kpi.value}
            </p>
            {kpi.sub && !loading && (
              <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5 truncate">
                {kpi.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="kanban-mobile-scroll md:grid md:grid-cols-2 xl:grid-cols-6 md:gap-3">
        {STAGES.map((stage) => {
          const stageDeals = grouped[stage.id];
          const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          const isOver = dragOverStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage.id)}
              className={`rounded-xl border bg-[var(--surface)] transition-colors ${
                isOver
                  ? "border-[var(--primary)] bg-[var(--surface-hover)]"
                  : "border-[var(--border)]"
              }`}
            >
              <div className="px-3 py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-[12px] font-semibold text-[var(--foreground)]">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5 tabular-nums">
                  {formatCurrency(stageValue, true)}
                </p>
              </div>
              <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto scrollbar-thin">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-lg" />
                  ))
                ) : stageDeals.length === 0 ? (
                  <p className="text-[10px] text-center text-[var(--foreground-dim)] py-6">
                    No deals
                  </p>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => setDetailDeal(deal)}
                      onDragStart={() => setDraggingId(deal.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {createOpen && (
        <CreateDealModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void fetchDeals();
          }}
        />
      )}

      {detailDeal && (
        <DealDetailModal
          deal={detailDeal}
          onClose={() => setDetailDeal(null)}
          onUpdated={() => {
            setDetailDeal(null);
            void fetchDeals();
          }}
        />
      )}
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

// memo() — kanban re-renders on every drag move; this card only changes
// when its deal payload changes, so the memo cuts re-renders to ~1/N where
// N is the number of deals in the column.
const DealCard = memo(function DealCard({
  deal,
  onClick,
  onDragStart,
  onDragEnd,
}: DealCardProps) {
  const brandColor = deal.brand?.color || "#6366F1";
  const ownerInitials = deal.owner
    ? `${deal.owner.firstName[0] || ""}${deal.owner.lastName[0] || ""}`
    : "?";

  // Score color: 0-40 red, 41-70 yellow, 71-100 green
  const scoreColor =
    deal.dealScore >= 71
      ? "#10B981"
      : deal.dealScore >= 41
        ? "#F59E0B"
        : "#EF4444";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`p-3 rounded-lg bg-[var(--background)] border hover:border-[var(--border-hover)] cursor-grab active:cursor-grabbing transition-all relative ${
        deal.isStale ? "border-red-500/40" : "border-[var(--border)]"
      }`}
    >
      {deal.isStale && (
        <span
          className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--background)]"
          title={`Stale: ${deal.daysInStage} days in stage`}
        />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[12px] font-semibold text-[var(--foreground)] line-clamp-2 flex-1">
          {deal.title}
        </p>
        {deal.brand && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            {deal.brand.code}
          </span>
        )}
      </div>
      {(deal.client || deal.lead) && (
        <div className="flex items-center gap-1 mb-2">
          <Building2 className="w-3 h-3 text-[var(--foreground-dim)]" />
          <p className="text-[10px] text-[var(--foreground-dim)] truncate">
            {deal.client?.companyName || deal.lead?.companyName}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-[var(--foreground)] tabular-nums">
          {formatCurrency(deal.value, true)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[var(--foreground-dim)] tabular-nums">
            {deal.probability}%
          </span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
            style={{ backgroundColor: brandColor }}
            title={
              deal.owner
                ? `${deal.owner.firstName} ${deal.owner.lastName}`
                : "Unassigned"
            }
          >
            {ownerInitials}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-[var(--foreground-dim)]">
        <span
          className="tabular-nums"
          style={{ color: deal.isStale ? "#EF4444" : undefined }}
        >
          {deal.daysInStage}d in stage
        </span>
        <div className="flex items-center gap-2">
          {deal.isFollowUpOverdue && (
            <span className="text-red-500" title="Follow-up overdue">
              ⏰
            </span>
          )}
          {deal.dealScore > 0 && (
            <span
              className="px-1 py-0.5 rounded font-semibold tabular-nums"
              style={{
                backgroundColor: `${scoreColor}15`,
                color: scoreColor,
              }}
              title={`Lead score: ${deal.dealScore}/100`}
            >
              {deal.dealScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

function CreateDealModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { activeCompany } = useCompany();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<DealStage>("NEW");
  const [probability, setProbability] = useState("20");
  const [expectedClose, setExpectedClose] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          value: parseFloat(value) || 0,
          stage,
          probability: parseInt(probability) || 20,
          expectedClose: expectedClose || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create deal");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
            New Deal
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
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full text-[12px]"
              placeholder={`e.g. ${activeCompany.name} retainer Q2`}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full text-[12px] resize-none"
              rows={3}
              placeholder="Optional context about the deal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Value (USD)
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input-field w-full text-[12px]"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Probability %
              </label>
              <input
                type="number"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="input-field w-full text-[12px]"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="input-field w-full text-[12px]"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Expected close
              </label>
              <input
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
                className="input-field w-full text-[12px]"
              />
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
              {submitting ? "Creating…" : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealDetailModal({
  deal,
  onClose,
  onUpdated,
}: {
  deal: Deal;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [fullDeal, setFullDeal] = useState<Deal | null>(null);
  const [activityContent, setActivityContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/deals/${deal.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setFullDeal(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [deal.id]);

  const addActivity = async () => {
    if (!activityContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "NOTE", content: activityContent.trim() }),
      });
      if (res.ok) {
        setActivityContent("");
        // Refetch
        const dd = await fetch(`/api/deals/${deal.id}`).then((r) => r.json());
        setFullDeal(dd);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete deal "${deal.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
      if (res.ok) onUpdated();
    } catch {
      // ignore
    }
  };

  const d = fullDeal || deal;
  const stageColor = STAGES.find((s) => s.id === d.stage)?.color || "#6366F1";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
                style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
              >
                {STAGES.find((s) => s.id === d.stage)?.label}
              </span>
              {d.brand && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-semibold"
                  style={{
                    backgroundColor: `${d.brand.color}20`,
                    color: d.brand.color,
                  }}
                >
                  {d.brand.code}
                </span>
              )}
            </div>
            <h3 className="text-[18px] font-semibold text-[var(--foreground)]">
              {d.title}
            </h3>
            <p className="text-[20px] font-bold text-[var(--foreground)] tabular-nums mt-1">
              {formatCurrency(d.value, true)}{" "}
              <span className="text-[11px] font-normal text-[var(--foreground-dim)]">
                · {d.probability}% probability
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {d.description && (
            <div>
              <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-1">
                Description
              </p>
              <p className="text-[12px] text-[var(--foreground-muted)]">
                {d.description}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            {d.owner && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[var(--foreground-dim)]" />
                <span className="text-[var(--foreground-muted)]">
                  {d.owner.firstName} {d.owner.lastName}
                </span>
              </div>
            )}
            {(d.client || d.lead) && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[var(--foreground-dim)]" />
                <span className="text-[var(--foreground-muted)]">
                  {d.client?.companyName || d.lead?.companyName}
                </span>
              </div>
            )}
            {d.expectedClose && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[var(--foreground-dim)]" />
                <span className="text-[var(--foreground-muted)]">
                  Closes {new Date(d.expectedClose).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-2">
              Activity
            </p>
            <div className="space-y-2">
              {d.activities.length === 0 ? (
                <p className="text-[11px] text-[var(--foreground-dim)] italic">
                  No activity yet
                </p>
              ) : (
                d.activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-2 text-[11px] p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                  >
                    <Activity className="w-3 h-3 text-[var(--foreground-dim)] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--foreground-muted)]">{a.content}</p>
                      <p className="text-[9px] text-[var(--foreground-dim)] mt-0.5">
                        {a.user
                          ? `${a.user.firstName} ${a.user.lastName} · `
                          : ""}
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={activityContent}
                onChange={(e) => setActivityContent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addActivity()}
                placeholder="Add a note…"
                className="input-field flex-1 text-[12px]"
              />
              <button
                onClick={addActivity}
                disabled={submitting || !activityContent.trim()}
                className="btn-primary text-[12px]"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border)] flex justify-between">
          <button
            onClick={handleDelete}
            className="text-[12px] text-[var(--danger)] hover:underline"
          >
            Delete deal
          </button>
          <button onClick={onClose} className="btn-secondary text-[12px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
