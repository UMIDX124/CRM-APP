"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Briefcase,
  DollarSign,
  User,
  Calendar,
  ChevronRight,
  Star,
  TrendingUp,
  XCircle,
  Target,
} from "lucide-react";
import { clsx } from "clsx";
import { brands } from "@/data/mock-data";

const brandColors: Record<string, string> = {
  VCS: "#D4AF37",
  BSL: "#3B82F6",
  DPL: "#22C55E",
};

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  countryFlag: string;
  services: string[];
  brand: "VCS" | "BSL" | "DPL";
  source: string;
  status: "NEW" | "QUALIFIED" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST";
  value: number;
  salesRep: string;
  createdAt: string;
}

const leads: Lead[] = [
  // VCS Leads
  {
    id: "1",
    companyName: "Singapore FinTech Corp",
    contactName: "David Tan",
    email: "david@sgfintech.sg",
    country: "Singapore",
    countryFlag: "🇸🇬",
    services: ["Web Development", "SEO Optimization"],
    brand: "VCS",
    source: "Website - VCS",
    status: "PROPOSAL_SENT",
    value: 8500,
    salesRep: "Zainab Butt",
    createdAt: "2026-03-20",
  },
  {
    id: "2",
    companyName: "London Legal Services",
    contactName: "James Wilson",
    email: "james@llsolicitors.co.uk",
    country: "United Kingdom",
    countryFlag: "🇬🇧",
    services: ["Virtual Assistants", "Admin Support"],
    brand: "VCS",
    source: "LinkedIn - VCS",
    status: "NEGOTIATION",
    value: 4200,
    salesRep: "Sarah Williams",
    createdAt: "2026-03-18",
  },
  {
    id: "3",
    companyName: "Paris Fashion House",
    contactName: "Marie Dupont",
    email: "marie@parisfashion.fr",
    country: "France",
    countryFlag: "🇫🇷",
    services: ["Social Media", "Content Marketing"],
    brand: "VCS",
    source: "Referral",
    status: "QUALIFIED",
    value: 3800,
    salesRep: "Usman Tariq",
    createdAt: "2026-03-25",
  },
  {
    id: "4",
    companyName: "Tokyo Tech Ventures",
    contactName: "Yuki Tanaka",
    email: "yuki@tokyotech.jp",
    country: "Japan",
    countryFlag: "🇯🇵",
    services: ["Web Development", "App Development"],
    brand: "VCS",
    source: "Website - VCS",
    status: "NEW",
    value: 12000,
    salesRep: "Hamza Ali",
    createdAt: "2026-03-29",
  },
  // BSL Leads
  {
    id: "5",
    companyName: "Cape Town Logistics",
    contactName: "Thabo Molefe",
    email: "thabo@ctl.co.za",
    country: "South Africa",
    countryFlag: "🇿🇦",
    services: ["Cloud Backup", "Disaster Recovery"],
    brand: "BSL",
    source: "Website - BSL",
    status: "WON",
    value: 5600,
    salesRep: "Zainab Butt",
    createdAt: "2026-03-10",
  },
  {
    id: "6",
    companyName: "Mexican Retail Group",
    contactName: "Carlos Rodriguez",
    email: "carlos@mexicanretail.mx",
    country: "Mexico",
    countryFlag: "🇲🇽",
    services: ["Data Backup", "Security Solutions"],
    brand: "BSL",
    source: "Cold Outreach",
    status: "LOST",
    value: 2800,
    salesRep: "Fatima Hassan",
    createdAt: "2026-03-05",
  },
  {
    id: "7",
    companyName: "Brazilian E-commerce",
    contactName: "Ana Silva",
    email: "ana@braecommerce.br",
    country: "Brazil",
    countryFlag: "🇧🇷",
    services: ["Cloud Solutions", "Data Protection"],
    brand: "BSL",
    source: "Website - BSL",
    status: "QUALIFIED",
    value: 7800,
    salesRep: "Ahmed Khan",
    createdAt: "2026-03-22",
  },
  // DPL Leads
  {
    id: "8",
    companyName: "Dubai Real Estate",
    contactName: "Ahmed Al-Rashid",
    email: "ahmed@dubaire.ae",
    country: "UAE",
    countryFlag: "🇦🇪",
    services: ["Performance Marketing", "Google Ads"],
    brand: "DPL",
    source: "Website - DPL",
    status: "PROPOSAL_SENT",
    value: 15000,
    salesRep: "Faizan Khan",
    createdAt: "2026-03-15",
  },
  {
    id: "9",
    companyName: "Sydney Tech Startup",
    contactName: "Emma Thompson",
    email: "emma@sydneytech.au",
    country: "Australia",
    countryFlag: "🇦🇺",
    services: ["SEO", "Lead Generation"],
    brand: "DPL",
    source: "LinkedIn - DPL",
    status: "NEW",
    value: 6500,
    salesRep: "Anwaar Ahmed",
    createdAt: "2026-03-28",
  },
  {
    id: "10",
    companyName: "Toronto Finance Corp",
    contactName: "Michael Brown",
    email: "michael@torontofinance.ca",
    country: "Canada",
    countryFlag: "🇨🇦",
    services: ["Facebook Ads", "Analytics"],
    brand: "DPL",
    source: "Referral",
    status: "WON",
    value: 9500,
    salesRep: "Faizan Khan",
    createdAt: "2026-03-08",
  },
];

const stages = [
  { id: "NEW", label: "New", color: "#8B5CF6" },
  { id: "QUALIFIED", label: "Qualified", color: "#3B82F6" },
  { id: "PROPOSAL_SENT", label: "Proposal", color: "#F59E0B" },
  { id: "NEGOTIATION", label: "Negotiation", color: "#06B6D4" },
  { id: "WON", label: "Won", color: "#22C55E" },
  { id: "LOST", label: "Lost", color: "#EF4444" },
];

export default function PipelineModule({ brandId = "1" }: { brandId?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "all" || lead.status === selectedStage;
    const matchesBrand = selectedBrand === "all" || lead.brand === selectedBrand;
    return matchesSearch && matchesStage && matchesBrand;
  });

  const getLeadsByStage = (stage: string) => {
    return filteredLeads.filter((l) => l.status === stage);
  };

  const getStageValue = (stage: string) => {
    return filteredLeads
      .filter((l) => l.status === stage)
      .reduce((sum, l) => sum + l.value, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const wonLeads = leads.filter((l) => l.status === "WON");
  const totalPipeline = leads.filter((l) => !["WON", "LOST"].includes(l.status)).reduce((sum, l) => sum + l.value, 0);
  const conversionRate = Math.round((wonLeads.length / leads.filter((l) => l.status !== "LOST").length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Sales Pipeline</h2>
          <p className="text-white/50 mt-1">Track your leads and deals through the sales funnel</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <Target className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{leads.length}</p>
              <p className="text-xs text-white/50">Total Leads</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <DollarSign className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalPipeline)}</p>
              <p className="text-xs text-white/50">Pipeline Value</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/20">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{wonLeads.length}</p>
              <p className="text-xs text-white/50">Deals Won</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Star className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{conversionRate}%</p>
              <p className="text-xs text-white/50">Conversion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </div>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          <option value="all" className="bg-[#0f0f18]">All Stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id} className="bg-[#0f0f18]">
              {stage.label}
            </option>
          ))}
        </select>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          <option value="all" className="bg-[#0f0f18]">All Brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.code} className="bg-[#0f0f18]">
              {brand.code} - {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-6 gap-3">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const stageValue = getStageValue(stage.id);
          const isSelected = selectedStage === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(isSelected ? "all" : stage.id)}
              className={clsx(
                "rounded-xl p-4 transition-all text-left",
                isSelected
                  ? "bg-gradient-to-br from-white/10 to-white/5 border-2"
                  : "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-white/20"
              )}
              style={{
                borderColor: isSelected ? stage.color : undefined,
                boxShadow: isSelected ? `0 0 20px ${stage.color}20` : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs font-medium text-white/70">{stage.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{stageLeads.length}</p>
              <p className="text-xs text-white/40 mt-1">
                {formatCurrency(stageValue)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Leads List */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Lead</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Services</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Source</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Value</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Sales Rep</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-white/50 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const stage = stages.find((s) => s.id === lead.status);
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{lead.companyName}</p>
                          <p className="text-xs text-white/50">{lead.contactName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.services.slice(0, 2).map((service) => (
                          <span key={service} className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60">
                            {service}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/70">{lead.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#D4AF37]">{formatCurrency(lead.value)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white text-[10px] font-bold">
                          {lead.salesRep.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="text-sm text-white/70">{lead.salesRep.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/50">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${stage?.color}20`,
                            color: stage?.color,
                          }}
                        >
                          {stage?.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/30" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
