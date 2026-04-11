"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  Monitor,
  Smartphone,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface TopPage {
  page: string;
  views: number;
  avgDuration: number;
}

interface DeviceEntry {
  device: string;
  count: number;
}

interface ReferrerEntry {
  referrer: string;
  count: number;
}

interface DailyView {
  date: string;
  count: number;
}

interface AnalyticsData {
  totalVisitors: number;
  uniqueSessions: number;
  leadCount: number;
  conversionRate: string;
  topPages: TopPage[];
  deviceSplit: DeviceEntry[];
  referrerBreakdown: ReferrerEntry[];
  dailyViews: DailyView[];
}

type DateRange = "7d" | "30d" | "90d";

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--surface)", ...style }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        borderRadius: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <SkeletonBlock className="h-4 w-24 mb-3" />
      <SkeletonBlock className="h-8 w-32 mb-2" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        borderRadius: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <SkeletonBlock className="h-5 w-40 mb-4" />
      <SkeletonBlock className="w-full" style={{ height }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        borderRadius: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <SkeletonBlock className="h-5 w-32 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10 w-full mb-2" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip for Recharts                                        */
/* ------------------------------------------------------------------ */

function renderTooltipBox(
  label: string | undefined,
  value: number | string | readonly (number | string)[] | undefined,
  valueLabel: string,
) {
  return (
    <div
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.5rem 0.75rem",
        fontSize: "0.8125rem",
      }}
    >
      <p style={{ color: "var(--foreground-muted)", marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ color: "var(--foreground)", fontWeight: 600 }}>
        {valueLabel}: {typeof value === "number" ? value.toLocaleString() : String(value ?? "")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        borderRadius: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "0.8125rem",
            color: "var(--foreground-muted)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <Icon size={18} style={{ color: accent ?? "var(--primary)" }} />
      </div>
      <span
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--foreground)",
          letterSpacing: "-0.025em",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Format seconds to readable duration                                */
/* ------------------------------------------------------------------ */

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/* ------------------------------------------------------------------ */
/*  DEVICE PIE COLORS                                                  */
/* ------------------------------------------------------------------ */

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#F59E0B",
  desktop: "#3B82F6",
  tablet: "#8B5CF6",
};

function deviceColor(device: string): string {
  return DEVICE_COLORS[device.toLowerCase()] ?? "#6B7280";
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ---- Fetch sites ---- */
  useEffect(() => {
    let cancelled = false;
    async function loadSites() {
      setSitesLoading(true);
      try {
        const res = await fetch("/api/sites");
        if (!res.ok) throw new Error("Failed to load sites");
        const json: Site[] = await res.json();
        if (!cancelled) setSites(json);
      } catch (err) {
        console.error("[analytics] sites fetch error:", err);
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    }
    loadSites();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Fetch analytics ---- */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range });
      if (selectedSiteId !== "all") params.set("siteId", selectedSiteId);
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load analytics data");
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick() {
      setDropdownOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [dropdownOpen]);

  /* ---- Derived ---- */
  const selectedSiteName =
    selectedSiteId === "all"
      ? "All Sites"
      : sites.find((s) => s.id === selectedSiteId)?.name ?? "Unknown";

  /* ---- Render ---- */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "var(--foreground)",
        padding: "1.5rem",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* ------- Header row ------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          Analytics
        </h1>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Site selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen((o) => !o);
              }}
              disabled={sitesLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "0.5rem",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: "0.8125rem",
                cursor: "pointer",
                minWidth: 160,
                justifyContent: "space-between",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sitesLoading ? "Loading..." : selectedSiteName}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, color: "var(--foreground-dim)" }} />
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: "100%",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  zIndex: 50,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={() => setSelectedSiteId("all")}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.875rem",
                    background:
                      selectedSiteId === "all"
                        ? "var(--primary)"
                        : "transparent",
                    color:
                      selectedSiteId === "all"
                        ? "#000"
                        : "var(--foreground)",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                  }}
                >
                  All Sites
                </button>
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.875rem",
                      background:
                        selectedSiteId === site.id
                          ? "var(--primary)"
                          : "transparent",
                      color:
                        selectedSiteId === site.id
                          ? "#000"
                          : "var(--foreground)",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {site.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range picker */}
          <div
            style={{
              display: "flex",
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: range === r ? "var(--primary)" : "var(--surface)",
                  color: range === r ? "#000" : "var(--foreground-muted)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------- Error state ------- */}
      {error && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#FCA5A5",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.875rem",
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchAnalytics}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#FCA5A5",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ------- Stat cards ------- */}
      {loading || !data ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <StatCard
            icon={Eye}
            label="Total Visitors"
            value={data.totalVisitors}
            accent="#F59E0B"
          />
          <StatCard
            icon={Users}
            label="Unique Sessions"
            value={data.uniqueSessions}
            accent="#3B82F6"
          />
          <StatCard
            icon={TrendingUp}
            label="Leads Captured"
            value={data.leadCount}
            accent="#10B981"
          />
          <StatCard
            icon={BarChart3}
            label="Conversion Rate"
            value={data.conversionRate}
            accent="#8B5CF6"
          />
        </div>
      )}

      {/* ------- Daily visitors line chart ------- */}
      {loading || !data ? (
        <div style={{ marginBottom: "1.5rem" }}>
          <ChartSkeleton height={300} />
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--foreground)",
              margin: "0 0 1rem 0",
            }}
          >
            Daily Visitors
          </h2>
          {!data.dailyViews ||
          data.dailyViews.length === 0 ||
          data.dailyViews.every((d) => !d.count) ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "var(--foreground-dim)", gap: 8 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <p style={{ fontSize: 13, margin: 0 }}>No visitor data yet</p>
              <p style={{ fontSize: 11, margin: 0, opacity: 0.6 }}>Install the tracker on your websites to see traffic here.</p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data.dailyViews}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--foreground-dim)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                stroke="var(--foreground-dim)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return renderTooltipBox(label as string, payload[0].value, "Visitors");
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#F59E0B" }}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ------- Middle row: Top Pages + Device Split ------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Top Pages table */}
        {loading || !data ? (
          <TableSkeleton />
        ) : (
          <div
            className="card"
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--foreground)",
                margin: "0 0 1rem 0",
              }}
            >
              Top Pages
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8125rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.75rem",
                        color: "var(--foreground-muted)",
                        fontWeight: 500,
                      }}
                    >
                      Page
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.5rem 0.75rem",
                        color: "var(--foreground-muted)",
                        fontWeight: 500,
                      }}
                    >
                      Views
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.5rem 0.75rem",
                        color: "var(--foreground-muted)",
                        fontWeight: 500,
                      }}
                    >
                      Avg Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "var(--foreground-dim)",
                        }}
                      >
                        No page data available
                      </td>
                    </tr>
                  ) : (
                    data.topPages.map((page) => (
                      <tr
                        key={page.page}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          style={{
                            padding: "0.625rem 0.75rem",
                            color: "var(--foreground)",
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {page.page}
                        </td>
                        <td
                          style={{
                            padding: "0.625rem 0.75rem",
                            textAlign: "right",
                            color: "var(--foreground)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {page.views.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "0.625rem 0.75rem",
                            textAlign: "right",
                            color: "var(--foreground-muted)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtDuration(page.avgDuration)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Device Split donut chart */}
        {loading || !data ? (
          <ChartSkeleton height={240} />
        ) : (
          <div
            className="card"
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--foreground)",
                margin: "0 0 1rem 0",
              }}
            >
              Device Split
            </h2>
            {data.deviceSplit.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--foreground-dim)",
                  fontSize: "0.875rem",
                }}
              >
                No device data available
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  flex: 1,
                }}
              >
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.deviceSplit}
                      dataKey="count"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      strokeWidth={0}
                    >
                      {data.deviceSplit.map((entry) => (
                        <Cell
                          key={entry.device}
                          fill={deviceColor(entry.device)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        return (
                          <div
                            style={{
                              background: "var(--surface-elevated)",
                              border: "1px solid var(--border)",
                              borderRadius: "0.5rem",
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.8125rem",
                            }}
                          >
                            <p
                              style={{
                                color: "var(--foreground)",
                                fontWeight: 600,
                              }}
                            >
                              {String(item.name)}:{" "}
                              {Number(item.value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {data.deviceSplit.map((entry) => {
                    const total = data.deviceSplit.reduce(
                      (sum, e) => sum + e.count,
                      0,
                    );
                    const pct =
                      total > 0
                        ? ((entry.count / total) * 100).toFixed(1)
                        : "0";
                    const IconComp =
                      entry.device.toLowerCase() === "mobile"
                        ? Smartphone
                        : Monitor;
                    return (
                      <div
                        key={entry.device}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <IconComp
                          size={14}
                          style={{ color: deviceColor(entry.device) }}
                        />
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--foreground-muted)",
                          }}
                        >
                          {entry.device}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--foreground)",
                            marginLeft: "auto",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------- Referrer / Traffic Sources bar chart ------- */}
      {loading || !data ? (
        <ChartSkeleton height={280} />
      ) : (
        <div
          className="card"
          style={{
            padding: "1.25rem",
            borderRadius: "0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--foreground)",
              margin: "0 0 1rem 0",
            }}
          >
            Traffic Sources
          </h2>
          {data.referrerBreakdown.length === 0 ? (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--foreground-dim)",
                fontSize: "0.875rem",
              }}
            >
              No referrer data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.referrerBreakdown}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="referrer"
                  stroke="var(--foreground-dim)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="var(--foreground-dim)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return renderTooltipBox(label as string, payload[0].value, "Visits");
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* responsive grid override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
