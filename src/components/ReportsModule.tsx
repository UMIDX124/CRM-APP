"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  Users,
  Building2,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

/**
 * Reports payload — must match /api/reports response shape exactly.
 * Every array defaults to empty when the tenant has no data so the UI
 * renders clean empty states instead of crashing.
 */
interface ReportsData {
  summary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalClients: number;
    totalEmployees: number;
    tasksCompleted: number;
    tasksTotal: number;
  };
  revenue: Array<Record<string, string | number>>;
  brands: Array<{ name: string; code: string; revenue: number; color: string }>;
  topClients: Array<{ name: string; mrr: number; status: string }>;
  topEmployees: Array<{ name: string; department: string; score: number }>;
  tasks: Array<{ status: string; count: number }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function ReportsModule() {
  const [selectedPeriod, setSelectedPeriod] = useState("last30days");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/reports")
      .then((r) => {
        if (!r.ok) throw new Error(`Reports API ${r.status}`);
        return r.json();
      })
      .then((payload: ReportsData) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[reports] fetch failed:", err);
        setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = data?.summary;
  const revenueRows = data?.revenue ?? [];
  const brands = data?.brands ?? [];
  const topClients = data?.topClients ?? [];
  const topEmployees = data?.topEmployees ?? [];

  const generatePDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Alpha Command Center", 14, pageHeight - 10);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    };

    // --- Page 1: Title & Summary ---
    doc.setFontSize(28);
    doc.setTextColor(40);
    doc.text("Alpha Business Report", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(120);
    doc.text(`Generated: ${today}`, pageWidth / 2, 52, { align: "center" });

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(14, 60, pageWidth - 14, 60);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Executive Summary", 14, 78);

    const summaryData = [
      ["Total Revenue (Latest Month)", formatCurrency(data.summary.totalRevenue)],
      ["Revenue Growth", `${data.summary.revenueGrowth >= 0 ? "+" : ""}${data.summary.revenueGrowth}%`],
      ["Total Clients", String(data.summary.totalClients)],
      ["Total Employees", String(data.summary.totalEmployees)],
      ["Tasks Completed", `${data.summary.tasksCompleted} / ${data.summary.tasksTotal}`],
    ];

    autoTable(doc, {
      startY: 85,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 11, cellPadding: 6 },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    });

    // --- Page 2: Revenue ---
    if (revenueRows.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Revenue Breakdown by Month", 14, 25);

      const brandCodes = brands.map((b) => b.code.toLowerCase());
      const pdfRevenueRows = revenueRows.map((r) => {
        const base: (string | number)[] = [String(r.month)];
        let total = 0;
        for (const code of brandCodes) {
          const value = Number(r[code] || 0);
          base.push(formatCurrency(value));
          total += value;
        }
        base.push(formatCurrency(total));
        return base;
      });

      autoTable(doc, {
        startY: 32,
        head: [["Month", ...brands.map((b) => b.code), "Total"]],
        body: pdfRevenueRows,
        theme: "striped",
        headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 5 },
      });
    }

    // --- Page 3: Top Clients ---
    if (topClients.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Top Clients", 14, 25);

      autoTable(doc, {
        startY: 32,
        head: [["Company", "MRR", "Status"]],
        body: topClients.map((c) => [c.name, formatCurrency(c.mrr), c.status]),
        theme: "striped",
        headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 1: { halign: "right" } },
      });
    }

    // --- Page 4: Employees ---
    if (topEmployees.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Top Performers", 14, 25);

      autoTable(doc, {
        startY: 32,
        head: [["Name", "Department", "Tasks Owned"]],
        body: topEmployees.map((e) => [e.name, e.department, String(e.score)]),
        theme: "striped",
        headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 2: { halign: "right" } },
      });
    }

    const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`Alpha-Report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-[var(--foreground-dim)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading reports…</span>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="page-container">
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-6 text-center">
          <p className="text-[var(--danger)] font-medium mb-1">Reports failed to load</p>
          <p className="text-[var(--foreground-dim)] text-sm">{error || "Unknown error"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-[var(--surface-hover)] text-[var(--foreground)] text-sm hover:bg-[var(--border)] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const revenueMaxTotal = Math.max(
    1,
    ...revenueRows.map((r) => {
      let s = 0;
      for (const k of Object.keys(r)) if (k !== "month") s += Number(r[k] || 0);
      return s;
    })
  );
  const brandsMax = Math.max(1, ...brands.map((b) => b.revenue));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--foreground)]">Reports &amp; Analytics</h2>
          <p className="text-[var(--foreground-dim)] mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-black font-medium hover:bg-[var(--primary-hover)] transition-all"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-[var(--surface)] rounded-xl p-1 w-fit">
        {["last7days", "last30days", "last90days", "lastYear"].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm transition-all",
              selectedPeriod === period
                ? "bg-[var(--primary)] text-black font-medium"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            {period === "last7days" ? "7 Days" :
             period === "last30days" ? "30 Days" :
             period === "last90days" ? "90 Days" : "1 Year"}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--primary)]/20 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/20">
              <DollarSign className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{formatCurrency(summary.totalRevenue)}</p>
          <div className={clsx("flex items-center gap-1 text-xs", summary.revenueGrowth >= 0 ? "text-[#22C55E]" : "text-[var(--danger)]")}>
            {summary.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{summary.revenueGrowth >= 0 ? "+" : ""}{summary.revenueGrowth}% vs last month</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Building2 className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Total Clients</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{summary.totalClients}</p>
          <div className="flex items-center gap-1 text-[var(--foreground-dim)] text-xs">
            <span>in your tenant</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <Users className="w-5 h-5 text-[#22C55E]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Employees</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{summary.totalEmployees}</p>
          <div className="flex items-center gap-1 text-[var(--foreground-dim)] text-xs">
            <span>active across team</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/20">
              <CheckCircle className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Tasks Completed</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{summary.tasksCompleted}</p>
          <div className="flex items-center gap-1 text-[var(--foreground-dim)] text-xs">
            <span>of {summary.tasksTotal} total</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Revenue Trend</h3>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {brands.map((b) => (
                <div key={b.code} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-[var(--foreground-muted)]">{b.code}</span>
                </div>
              ))}
            </div>
          </div>
          {revenueRows.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-[var(--foreground-dim)] text-sm">
              No revenue yet — paid invoices will appear here
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {revenueRows.map((month) => {
                let monthTotal = 0;
                for (const k of Object.keys(month)) {
                  if (k !== "month") monthTotal += Number(month[k] || 0);
                }
                const totalHeight = (monthTotal / revenueMaxTotal) * 100;
                return (
                  <div key={String(month.month)} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex gap-1 items-end" style={{ height: `${totalHeight}%` }}>
                      {brands.map((b) => {
                        const v = Number(month[b.code.toLowerCase()] || 0);
                        return (
                          <div
                            key={b.code}
                            className="flex-1 rounded-t"
                            style={{ height: `${(v / revenueMaxTotal) * 100}%`, backgroundColor: b.color }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs text-[var(--foreground-dim)]">{String(month.month).split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by Brand */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-6">Revenue by Brand</h3>
          {brands.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[var(--foreground-dim)] text-sm">
              No brands configured
            </div>
          ) : (
            <div className="space-y-4">
              {brands.map((brand) => {
                const percentage = Math.round((brand.revenue / brandsMax) * 100);
                return (
                  <div key={brand.code}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                        <span className="text-sm text-[var(--foreground)]">{brand.name}</span>
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(brand.revenue)}</span>
                    </div>
                    <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: brand.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Top Clients by MRR</h3>
          </div>
          {topClients.length === 0 ? (
            <div className="p-8 text-center text-[var(--foreground-dim)] text-sm">No clients yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {topClients.map((client, i) => (
                <div key={client.name + i} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-xs text-[var(--foreground-muted)]">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{client.name}</p>
                      <p className="text-xs text-[var(--foreground-dim)]">{client.status}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--primary)]">{formatCurrency(client.mrr)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Employees */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Top Performers</h3>
            <p className="text-xs text-[var(--foreground-dim)] mt-0.5">Ranked by tasks owned</p>
          </div>
          {topEmployees.length === 0 ? (
            <div className="p-8 text-center text-[var(--foreground-dim)] text-sm">No team members yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {topEmployees.map((emp, i) => {
                const maxScore = Math.max(1, ...topEmployees.map((e) => e.score));
                const pct = Math.round((emp.score / maxScore) * 100);
                return (
                  <div key={emp.name + i} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-black text-xs font-bold">
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{emp.name}</p>
                        <p className="text-xs text-[var(--foreground-dim)]">{emp.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-[#22C55E] w-10 tabular-nums">{emp.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[var(--foreground-dim)] text-sm">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p className="mt-1">Alpha Command Center</p>
      </div>
    </div>
  );
}
