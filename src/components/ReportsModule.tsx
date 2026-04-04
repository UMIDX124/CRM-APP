"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  CheckCircle,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Share2,
} from "lucide-react";
import { clsx } from "clsx";

interface ReportData {
  clients: { name: string; mrr: number; status: string }[];
  employees: { name: string; performance: number; department: string }[];
  tasks: { status: string; count: number }[];
  revenue: { month: string; vcs: number; bsl: number; dpl: number }[];
  brands: { name: string; revenue: number; color: string }[];
}

const reportData: ReportData = {
  clients: [
    { name: "B2B SaaS Company", mrr: 28000, status: "Healthy" },
    { name: "SecureBank", mrr: 25000, status: "Healthy" },
    { name: "DTC E-Commerce Brand", mrr: 22000, status: "Healthy" },
    { name: "DataFlow Analytics", mrr: 18000, status: "Healthy" },
    { name: "TechMart", mrr: 15000, status: "Healthy" },
    { name: "SaaS Startup Client", mrr: 12000, status: "Healthy" },
    { name: "Marketing Agency Partner", mrr: 5800, status: "Healthy" },
    { name: "Sarah Mitchell E-Commerce", mrr: 8500, status: "Healthy" },
  ],
  employees: [
    { name: "Faizan", performance: 98, department: "Leadership" },
    { name: "Anwaar", performance: 97, department: "Leadership" },
    { name: "Ali Raza", performance: 96, department: "Development" },
    { name: "Sarah Williams", performance: 95, department: "Development" },
    { name: "Ahmed Khan", performance: 94, department: "Marketing" },
    { name: "Hamza Ali", performance: 92, department: "Development" },
    { name: "Fatima Hassan", performance: 88, department: "Marketing" },
    { name: "Usman Tariq", performance: 87, department: "Marketing" },
  ],
  tasks: [
    { status: "To Do", count: 3 },
    { status: "In Progress", count: 4 },
    { status: "Review", count: 1 },
    { status: "Done", count: 8 },
  ],
  revenue: [
    { month: "Oct", vcs: 85000, bsl: 65000, dpl: 55000 },
    { month: "Nov", vcs: 92000, bsl: 72000, dpl: 62000 },
    { month: "Dec", vcs: 88000, bsl: 68000, dpl: 58000 },
    { month: "Jan", vcs: 105000, bsl: 85000, dpl: 78000 },
    { month: "Feb", vcs: 112000, bsl: 92000, dpl: 95000 },
    { month: "Mar", vcs: 118000, bsl: 98000, dpl: 124890 },
  ],
  brands: [
    { name: "Performance Marketing", revenue: 185000, color: "#22C55E" },
    { name: "Web Architecture", revenue: 142000, color: "#3B82F6" },
    { name: "Remote Workforce", revenue: 98000, color: "#FF6B00" },
    { name: "AI & Analytics", revenue: 85000, color: "#F59E0B" },
    { name: "Cloud & Security", revenue: 72000, color: "#F59E0B" },
  ],
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function ReportsModule() {
  const [selectedPeriod, setSelectedPeriod] = useState("last30days");

  const totalRevenue = reportData.revenue[reportData.revenue.length - 1].vcs + 
                       reportData.revenue[reportData.revenue.length - 1].bsl + 
                       reportData.revenue[reportData.revenue.length - 1].dpl;
  
  const prevRevenue = reportData.revenue[reportData.revenue.length - 2].vcs + 
                      reportData.revenue[reportData.revenue.length - 2].bsl + 
                      reportData.revenue[reportData.revenue.length - 2].dpl;
  
  const revenueGrowth = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);

  const generatePDF = () => {
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
      doc.text("FU Corp Command Center", 14, pageHeight - 10);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    };

    // --- Page 1: Title & Summary ---
    doc.setFontSize(28);
    doc.setTextColor(40);
    doc.text("FU Corp Business Report", pageWidth / 2, 40, { align: "center" });

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
      ["Total Revenue (Latest Month)", formatCurrency(totalRevenue)],
      ["Revenue Growth", `+${revenueGrowth}%`],
      ["Total Clients", String(reportData.clients.length)],
      ["Total Employees", String(reportData.employees.length)],
      ["Active Tasks", String(reportData.tasks.reduce((acc, t) => acc + t.count, 0))],
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

    // --- Page 2: Revenue Table ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Revenue Breakdown by Month", 14, 25);

    const revenueRows = reportData.revenue.map((r) => [
      r.month,
      formatCurrency(r.vcs),
      formatCurrency(r.bsl),
      formatCurrency(r.dpl),
      formatCurrency(r.vcs + r.bsl + r.dpl),
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Month", "VCS", "BSL", "DPL", "Total"]],
      body: revenueRows,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
    });

    // --- Page 3: Top Clients ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Top Clients", 14, 25);

    const clientRows = reportData.clients.map((c) => [
      c.name,
      formatCurrency(c.mrr),
      c.status,
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Company", "MRR", "Health Score"]],
      body: clientRows,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 1: { halign: "right" } },
    });

    // --- Page 4: Employee Performance ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Employee Performance", 14, 25);

    const employeeRows = reportData.employees.map((e) => [
      e.name,
      e.department,
      `${e.performance}%`,
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Name", "Department", "Score"]],
      body: employeeRows,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 2: { halign: "right" } },
    });

    // Add footers to all pages
    const totalPages = (doc as any).getNumberOfPages() as number;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`FU-Corp-Report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--foreground)]">Reports & Analytics</h2>
          <p className="text-[var(--foreground-dim)] mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] text-black font-medium hover:bg-[#FF8A33] transition-all"
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
                ? "bg-[#FF6B00] text-black font-medium"
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
        <div className="rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 border border-[#FF6B00]/20 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#FF6B00]/20">
              <DollarSign className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center gap-1 text-[#22C55E] text-xs">
            <ArrowUpRight className="w-3 h-3" />
            <span>+{revenueGrowth}% vs last month</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Building2 className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Total Clients</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{reportData.clients.length}</p>
          <div className="flex items-center gap-1 text-[#22C55E] text-xs">
            <ArrowUpRight className="w-3 h-3" />
            <span>+2 this month</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <Users className="w-5 h-5 text-[#22C55E]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Employees</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{reportData.employees.length}</p>
          <div className="flex items-center gap-1 text-[var(--foreground-dim)] text-xs">
            <span>Avg performance: 93%</span>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <CheckCircle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <span className="text-xs text-[var(--foreground-dim)]">Tasks Completed</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] mb-1">{reportData.tasks.find(t => t.status === "Done")?.count || 0}</p>
          <div className="flex items-center gap-1 text-[var(--foreground-dim)] text-xs">
            <span>of {reportData.tasks.reduce((acc, t) => acc + t.count, 0)} total</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Revenue Trend</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF6B00]" />
                <span className="text-[var(--foreground-muted)]">VCS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                <span className="text-[var(--foreground-muted)]">BSL</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                <span className="text-[var(--foreground-muted)]">DPL</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {reportData.revenue.map((month, i) => {
              const maxValue = Math.max(...reportData.revenue.map(r => r.vcs + r.bsl + r.dpl));
              const totalHeight = ((month.vcs + month.bsl + month.dpl) / maxValue) * 100;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex gap-1 items-end" style={{ height: `${totalHeight}%` }}>
                    <div className="flex-1 rounded-t bg-[#FF6B00]" style={{ height: `${(month.vcs / maxValue) * 100}%` }} />
                    <div className="flex-1 rounded-t bg-[#3B82F6]" style={{ height: `${(month.bsl / maxValue) * 100}%` }} />
                    <div className="flex-1 rounded-t bg-[#22C55E]" style={{ height: `${(month.dpl / maxValue) * 100}%` }} />
                  </div>
                  <span className="text-xs text-[var(--foreground-dim)]">{month.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-6">Revenue by Service</h3>
          <div className="space-y-4">
            {reportData.brands.map((brand, i) => {
              const maxRevenue = Math.max(...reportData.brands.map(b => b.revenue));
              const percentage = Math.round((brand.revenue / maxRevenue) * 100);
              return (
                <div key={brand.name}>
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
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Top Clients by MRR</h3>
          </div>
          <div className="divide-y divide-white/5">
            {reportData.clients.slice(0, 5).map((client, i) => (
              <div key={client.name} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-xs text-[var(--foreground-muted)]">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{client.name}</p>
                    <p className="text-xs text-[var(--foreground-dim)]">{client.status}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#FF6B00]">{formatCurrency(client.mrr)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Employee Performance</h3>
          </div>
          <div className="divide-y divide-white/5">
            {reportData.employees.slice(0, 5).map((emp, i) => (
              <div key={emp.name} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#E05500] flex items-center justify-center text-black text-xs font-bold">
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{emp.name}</p>
                    <p className="text-xs text-[var(--foreground-dim)]">{emp.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${emp.performance}%` }} />
                  </div>
                  <span className="text-sm font-medium text-[#22C55E] w-10">{emp.performance}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-6">Company Portfolio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VCS */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-transparent border border-[#FF6B00]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF6B00] flex items-center justify-center text-black font-bold">VC</div>
              <div>
                <h4 className="text-[var(--foreground)] font-medium">VCS</h4>
                <p className="text-xs text-[var(--foreground-dim)]">Virtual Customer Solution</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Website:</span> virtualcustomersolution.com</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Founded:</span> 2016</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Clients:</span> 200+</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Countries:</span> 15+</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Email:</span> adminatvcs@gmail.com</p>
            </div>
          </div>

          {/* BSL */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-[#3B82F6]/10 to-transparent border border-[#3B82F6]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6] flex items-center justify-center text-[var(--foreground)] font-bold">BS</div>
              <div>
                <h4 className="text-[var(--foreground)] font-medium">BSL</h4>
                <p className="text-xs text-[var(--foreground-dim)]">Backup Solutions LLC</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Website:</span> backup-solutions.vercel.app</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Founded:</span> 2018</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Focus:</span> Enterprise Technology</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Email:</span> backupsolutions1122@gmail.com</p>
            </div>
          </div>

          {/* DPL */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-[#22C55E]/10 to-transparent border border-[#22C55E]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center text-[var(--foreground)] font-bold">DP</div>
              <div>
                <h4 className="text-[var(--foreground)] font-medium">DPL</h4>
                <p className="text-xs text-[var(--foreground-dim)]">Digital Point LLC</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Website:</span> digitalpointllc.com</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Founded:</span> 2018</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Ad Spend:</span> $50M+ Managed</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Avg ROAS:</span> 4.2x</p>
              <p className="text-[var(--foreground-muted)]"><span className="text-[var(--foreground-dim)]">Email:</span> info@digitalpointllc.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[var(--foreground-dim)] text-sm">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p className="mt-1">FU Corp Command Center v1.0 - All Rights Reserved</p>
      </div>
    </div>
  );
}
