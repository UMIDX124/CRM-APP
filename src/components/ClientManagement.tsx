"use client";

import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  Building2,
  Phone,
  Mail,
  Globe,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Upload,
  Download,
  X,
  Save,
  FileSpreadsheet,
} from "lucide-react";
import { clsx } from "clsx";

interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  countryFlag: string;
  brand: string;
  accountManager: string;
  mrr: number;
  healthScore: number;
  healthStatus: "HEALTHY" | "AT_RISK" | "CHURNING";
  services: string[];
  activeTasks: number;
  lastActivity: string;
  result?: string;
}

const initialClients: Client[] = [
  {
    id: "1",
    companyName: "Sarah Mitchell E-Commerce",
    contactName: "Sarah Mitchell",
    email: "sarah@ecommerce-brand.com",
    phone: "+1 415-555-0123",
    country: "United States",
    countryFlag: "US",
    brand: "VCS",
    accountManager: "Ahmed Khan",
    mrr: 8500,
    healthScore: 92,
    healthStatus: "HEALTHY",
    services: ["AI CX", "Digital Marketing", "Remote Workforce"],
    activeTasks: 8,
    lastActivity: "2 hours ago",
    result: "340% ROI reported",
  },
  {
    id: "2",
    companyName: "SaaS Startup Client",
    contactName: "Tech Founder",
    email: "founder@saas-startup.io",
    phone: "+1 650-555-0124",
    country: "United States",
    countryFlag: "US",
    brand: "VCS",
    accountManager: "Ali Raza",
    mrr: 12000,
    healthScore: 88,
    healthStatus: "HEALTHY",
    services: ["Web Development", "Cloud Infrastructure", "Remote Staff"],
    activeTasks: 12,
    lastActivity: "1 day ago",
    result: "12 hires, 8 days ramp time, $18K saved/month",
  },
  {
    id: "3",
    companyName: "Marketing Agency Partner",
    contactName: "Agency Owner",
    email: "owner@marketing-agency.co",
    phone: "+44 20-555-0125",
    country: "United Kingdom",
    countryFlag: "UK",
    brand: "VCS",
    accountManager: "Fatima Hassan",
    mrr: 5800,
    healthScore: 95,
    healthStatus: "HEALTHY",
    services: ["SEO", "PPC", "Content Strategy"],
    activeTasks: 5,
    lastActivity: "30 minutes ago",
    result: "5 to 16 clients, +28% profit margin",
  },
  {
    id: "4",
    companyName: "TechMart",
    contactName: "Sarah Chen",
    email: "sarah.chen@techmart.com",
    phone: "+1 555-0126",
    country: "United States",
    countryFlag: "US",
    brand: "BSL",
    accountManager: "Hamza Ali",
    mrr: 15000,
    healthScore: 94,
    healthStatus: "HEALTHY",
    services: ["Web Architecture", "E-Commerce Platform"],
    activeTasks: 6,
    lastActivity: "2 hours ago",
    result: "340% revenue growth, 99.99% uptime",
  },
  {
    id: "5",
    companyName: "SecureBank",
    contactName: "CISO",
    email: "security@securebank.com",
    phone: "+1 212-555-0127",
    country: "United States",
    countryFlag: "US",
    brand: "BSL",
    accountManager: "Hamza Ali",
    mrr: 25000,
    healthScore: 98,
    healthStatus: "HEALTHY",
    services: ["Cybersecurity", "Banking Security Infrastructure"],
    activeTasks: 4,
    lastActivity: "4 hours ago",
    result: "Zero breaches, $2.3M saved",
  },
  {
    id: "6",
    companyName: "DataFlow Analytics",
    contactName: "CEO",
    email: "ceo@dataflow.ai",
    phone: "+1 408-555-0128",
    country: "United States",
    countryFlag: "US",
    brand: "BSL",
    accountManager: "Sarah Williams",
    mrr: 18000,
    healthScore: 91,
    healthStatus: "HEALTHY",
    services: ["AI Modeling", "Analytics Dashboard"],
    activeTasks: 5,
    lastActivity: "1 day ago",
    result: "10x faster insights, 98% accuracy",
  },
  {
    id: "7",
    companyName: "DTC E-Commerce Brand",
    contactName: "Marcus Thompson",
    email: "marcus@ecommerce-dtc.com",
    phone: "+1 310-555-0129",
    country: "United States",
    countryFlag: "US",
    brand: "DPL",
    accountManager: "Faizan",
    mrr: 22000,
    healthScore: 96,
    healthStatus: "HEALTHY",
    services: ["Performance Marketing", "Meta Ads", "Google Ads"],
    activeTasks: 7,
    lastActivity: "1 hour ago",
    result: "ROAS 4.2x to 6.8x, CAC -34%, +127% revenue",
  },
  {
    id: "8",
    companyName: "B2B SaaS Company",
    contactName: "Sarah Chen",
    email: "sarah.chen@b2b-saas.io",
    phone: "+1 415-555-0130",
    country: "United States",
    countryFlag: "US",
    brand: "DPL",
    accountManager: "Anwaar",
    mrr: 28000,
    healthScore: 93,
    healthStatus: "HEALTHY",
    services: ["Attribution Setup", "CRM Integration", "Media Buying"],
    activeTasks: 8,
    lastActivity: "3 hours ago",
    result: "+89% pipeline, CAC -41%",
  },
];

const brandColors: Record<string, string> = {
  VCS: "#D4AF37",
  BSL: "#3B82F6",
  DPL: "#22C55E",
};

const brandNames: Record<string, string> = {
  VCS: "Virtual Customer Solution",
  BSL: "Backup Solutions LLC",
  DPL: "Digital Point LLC",
};

const healthConfig = {
  HEALTHY: { color: "#22C55E", icon: CheckCircle, label: "Healthy" },
  AT_RISK: { color: "#F59E0B", icon: AlertCircle, label: "At Risk" },
  CHURNING: { color: "#EF4444", icon: XCircle, label: "Churning" },
};

interface ClientFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  brand: string;
  accountManager: string;
  mrr: string;
  services: string;
}

const emptyFormData: ClientFormData = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  country: "",
  brand: "VCS",
  accountManager: "",
  mrr: "",
  services: "",
};

export default function ClientManagement({ brandId = "1" }: { brandId?: string }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyFormData);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || client.healthStatus === filterStatus;
    const matchesBrand = filterBrand === "all" || client.brand === filterBrand;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        country: client.country,
        brand: client.brand,
        accountManager: client.accountManager,
        mrr: client.mrr.toString(),
        services: client.services.join(", "),
      });
    } else {
      setEditingClient(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData(emptyFormData);
  };

  const handleSaveClient = () => {
    const servicesArray = formData.services.split(",").map((s) => s.trim()).filter(Boolean);
    
    if (editingClient) {
      setClients(
        clients.map((c) =>
          c.id === editingClient.id
            ? {
                ...c,
                companyName: formData.companyName,
                contactName: formData.contactName,
                email: formData.email,
                phone: formData.phone,
                country: formData.country,
                brand: formData.brand,
                accountManager: formData.accountManager,
                mrr: parseFloat(formData.mrr) || 0,
                services: servicesArray,
              }
            : c
        )
      );
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        countryFlag: "US",
        brand: formData.brand,
        accountManager: formData.accountManager,
        mrr: parseFloat(formData.mrr) || 0,
        healthScore: 75,
        healthStatus: "HEALTHY",
        services: servicesArray,
        activeTasks: 0,
        lastActivity: "Just added",
      };
      setClients([...clients, newClient]);
    }
    handleCloseModal();
  };

  const handleDeleteClient = () => {
    if (deleteClientId) {
      setClients(clients.filter((c) => c.id !== deleteClientId));
      setIsDeleteModalOpen(false);
      setDeleteClientId(null);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const newClients: Client[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const clientData: any = {};
        
        headers.forEach((header, index) => {
          clientData[header] = values[index] || "";
        });

        if (clientData.companyname || clientData.company || clientData.name) {
          newClients.push({
            id: Date.now().toString() + i,
            companyName: clientData.companyname || clientData.company || clientData.name || "",
            contactName: clientData.contactname || clientData.contact || "",
            email: clientData.email || "",
            phone: clientData.phone || "",
            country: clientData.country || "United States",
            countryFlag: "US",
            brand: clientData.brand || "VCS",
            accountManager: clientData.accountmanager || clientData.manager || "",
            mrr: parseFloat(clientData.mrr || clientData.revenue || "0") || 0,
            healthScore: 75,
            healthStatus: "HEALTHY",
            services: (clientData.services || "").split("|").filter(Boolean),
            activeTasks: 0,
            lastActivity: "Just imported",
          });
        }
      }

      if (newClients.length > 0) {
        setClients([...clients, ...newClients]);
      }
      setIsUploadModalOpen(false);
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const sample = "companyName,contactName,email,phone,country,brand,accountManager,mrr,services\nSarah Mitchell E-Commerce,Sarah Mitchell,sarah@example.com,+1-555-0123,United States,VCS,Ahmed Khan,8500,AI CX|Digital Marketing|Remote Workforce";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Client Management</h2>
          <p className="text-white/50 mt-1">Manage and monitor your client relationships</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/20">
              <Building2 className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
              <p className="text-xs text-white/50">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {clients.filter((c) => c.healthStatus === "HEALTHY").length}
              </p>
              <p className="text-xs text-white/50">Healthy</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {clients.filter((c) => c.healthStatus === "AT_RISK").length}
              </p>
              <p className="text-xs text-white/50">At Risk</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/20">
              <TrendingUp className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                ${clients.reduce((sum, c) => sum + c.mrr, 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/50">Total MRR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </div>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          <option value="all" className="bg-[#0f0f18]">All Brands</option>
          <option value="VCS" className="bg-[#0f0f18]">VCS</option>
          <option value="BSL" className="bg-[#0f0f18]">Backup Solutions</option>
          <option value="DPL" className="bg-[#0f0f18]">Digital Point</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          <option value="all" className="bg-[#0f0f18]">All Status</option>
          <option value="HEALTHY" className="bg-[#0f0f18]">Healthy</option>
          <option value="AT_RISK" className="bg-[#0f0f18]">At Risk</option>
          <option value="CHURNING" className="bg-[#0f0f18]">Churning</option>
        </select>
      </div>

      {/* Client Table */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Health</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">MRR</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Services</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Result</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const HealthIcon = healthConfig[client.healthStatus].icon;
                const healthColor = healthConfig[client.healthStatus].color;
                const brandColor = brandColors[client.brand] || "#D4AF37";

                return (
                  <tr
                    key={client.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{client.companyName}</p>
                          <p className="text-xs text-white/50 truncate">{client.contactName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                      >
                        {client.brand}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <HealthIcon className="w-4 h-4" style={{ color: healthColor }} />
                        <span className="text-sm font-medium text-white">{client.healthScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-white">{formatCurrency(client.mrr)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {client.services.slice(0, 2).map((service) => (
                          <span key={service} className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60 whitespace-nowrap">
                            {service}
                          </span>
                        ))}
                        {client.services.length > 2 && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/40">
                            +{client.services.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-white/60 max-w-[150px] truncate">{client.result || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(client)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteClientId(client.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
</tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="Enter company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="+1-555-0123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="email@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="United States"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Brand</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                  >
                    <option value="VCS" className="bg-[#0f0f18]">VCS</option>
                    <option value="BSL" className="bg-[#0f0f18]">Backup Solutions</option>
                    <option value="DPL" className="bg-[#0f0f18]">Digital Point</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Account Manager</label>
                  <input
                    type="text"
                    value={formData.accountManager}
                    onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="Manager name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">MRR ($)</label>
                  <input
                    type="number"
                    value={formData.mrr}
                    onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="5000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Services (comma separated)</label>
                <input
                  type="text"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="SEO, PPC, Web Development"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClient}
                disabled={!formData.companyName}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all disabled:opacity-50"
              >
                {editingClient ? "Update" : "Add"} Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Client?</h3>
              <p className="text-white/60 text-center text-sm">
                Are you sure you want to delete this client? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Import Clients from CSV</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-6">
              <div
                className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-[#D4AF37]/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 mb-2">Click to upload CSV file</p>
                <p className="text-white/40 text-sm">or drag and drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </div>
              <button
                onClick={downloadSampleCSV}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Sample CSV
              </button>
              <div className="mt-4 p-4 rounded-xl bg-white/5">
                <p className="text-xs text-white/50 mb-2">CSV Format:</p>
                <code className="text-xs text-white/60">
                  companyName, contactName, email, phone, country, brand, accountManager, mrr, services
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
