"use client";

import { useState, useMemo } from "react";
import {
  Search, Plus, Users, Mail, Phone, Star, Edit, Trash2, X, Save,
  UserPlus, Building2, DollarSign, Calendar, Shield, ChevronDown,
  LayoutGrid, List, Filter, MoreVertical, BadgeCheck, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { employees as initialEmployees, brands, parentCompany } from "@/data/mock-data";
import type { Employee, EmployeeStatus } from "@/data/mock-data";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PROJECT_MANAGER: "Project Manager",
  DEPT_HEAD: "Department Head",
  TEAM_LEAD: "Team Lead",
  EMPLOYEE: "Employee",
};

const statusColors: Record<EmployeeStatus, { label: string; dot: string; bg: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-400", bg: "bg-emerald-500/10 text-emerald-400" },
  ON_LEAVE: { label: "On Leave", dot: "bg-amber-400", bg: "bg-amber-500/10 text-amber-400" },
  TERMINATED: { label: "Terminated", dot: "bg-red-400", bg: "bg-red-500/10 text-red-400" },
  PROBATION: { label: "Probation", dot: "bg-cyan-400", bg: "bg-cyan-500/10 text-cyan-400" },
};

const departments = ["LEADERSHIP", "MARKETING", "DEV", "CREATIVE", "SUPPORT", "ADMIN", "SALES", "OPS"];

const emptyEmployee: Omit<Employee, "id"> = {
  name: "", email: "", phone: "", avatar: null, title: "", department: "DEV",
  brand: "VCS", hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE",
  hireDate: new Date().toISOString().split("T")[0], salary: 0, currency: "USD",
  performanceScore: 0, availability: "AVAILABLE", skills: [],
  workload: 0, tasksCompleted: 0, totalTasks: 0,
};

export default function EmployeeDirectory({ brandId }: { brandId: string }) {
  const [employeeList, setEmployeeList] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState<string>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, "id">>(emptyEmployee);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");

  const filtered = useMemo(() => {
    return employeeList.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase()) && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterBrand !== "ALL" && e.brand !== filterBrand) return false;
      if (filterDept !== "ALL" && e.department !== filterDept) return false;
      if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
      return true;
    });
  }, [employeeList, search, filterBrand, filterDept, filterStatus]);

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData(emptyEmployee);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ ...emp });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) return;
    if (editingEmployee) {
      setEmployeeList((prev) => prev.map((e) => e.id === editingEmployee.id ? { ...formData, id: editingEmployee.id } : e));
    } else {
      const newId = String(Date.now());
      setEmployeeList((prev) => [...prev, { ...formData, id: newId }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setEmployeeList((prev) => prev.filter((e) => e.id !== id));
    setShowDeleteConfirm(null);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  const stats = useMemo(() => ({
    total: employeeList.length,
    active: employeeList.filter((e) => e.status === "ACTIVE").length,
    onLeave: employeeList.filter((e) => e.status === "ON_LEAVE").length,
    avgPerformance: Math.round(employeeList.reduce((a, e) => a + e.performanceScore, 0) / employeeList.length),
  }), [employeeList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-[10px] font-bold tracking-wider">
              {parentCompany.code} CORP
            </span>
            <span className="text-white/30 text-xs">Hires all employees</span>
          </div>
          <p className="text-white/50 text-sm">
            {stats.total} employees &bull; {stats.active} active &bull; {stats.avgPerformance}% avg performance
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Hire Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {brands.map((brand) => {
          const count = employeeList.filter((e) => e.brand === brand.code && e.status === "ACTIVE").length;
          return (
            <div key={brand.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                <span className="text-xs text-white/50">{brand.code}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-white/40">active employees</p>
            </div>
          );
        })}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3 h-3 text-[#FF6B00]" />
            <span className="text-xs text-white/50">Avg Performance</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgPerformance}%</p>
          <p className="text-xs text-white/40">across all companies</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text" placeholder="Search by name, email, or title..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
          />
        </div>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Companies</option>
          {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#0f0f1e]">{b.code}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Depts</option>
          {departments.map((d) => <option key={d} value={d} className="bg-[#0f0f1e]">{d}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#0f0f1e]">All Status</option>
          {Object.entries(statusColors).map(([k, v]) => <option key={k} value={k} className="bg-[#0f0f1e]">{v.label}</option>)}
        </select>
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          <button onClick={() => setViewMode("grid")} className={clsx("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40")}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={clsx("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-white/10 text-white" : "text-white/40")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Employee Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp, i) => {
            const sc = statusColors[emp.status];
            return (
              <div key={emp.id} className={clsx("p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all hover-lift group animate-fade-in-up", `stagger-${(i % 6) + 1}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-white/80">{emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-0.5">{emp.name}</h3>
                <p className="text-xs text-white/50 mb-3">{emp.title}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ color: brandColor(emp.brand), borderColor: brandColor(emp.brand) + "30", backgroundColor: brandColor(emp.brand) + "10" }}>
                    {emp.brand}
                  </span>
                  <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-medium", sc.bg)}>{sc.label}</span>
                </div>
                <div className="space-y-1.5 text-xs text-white/40">
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" /><span className="truncate">{emp.email}</span></div>
                  <div className="flex items-center gap-2"><Building2 className="w-3 h-3" /><span>{emp.department}</span></div>
                  <div className="flex items-center gap-2"><Shield className="w-3 h-3" /><span>{roleLabels[emp.role]}</span></div>
                </div>
                {/* Performance bar */}
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/40">Performance</span>
                    <span className={clsx("font-medium", emp.performanceScore >= 90 ? "text-emerald-400" : emp.performanceScore >= 70 ? "text-amber-400" : "text-red-400")}>
                      {emp.performanceScore}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${emp.performanceScore}%`, backgroundColor: emp.performanceScore >= 90 ? "#10B981" : emp.performanceScore >= 70 ? "#F59E0B" : "#EF4444" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Performance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Hired</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const sc = statusColors[emp.status];
                return (
                  <tr key={emp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white/80">{emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{emp.name}</p>
                          <p className="text-xs text-white/40">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border" style={{ color: brandColor(emp.brand), borderColor: brandColor(emp.brand) + "30", backgroundColor: brandColor(emp.brand) + "10" }}>{emp.brand}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{emp.title}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2 py-0.5 rounded-md text-[11px] font-medium", sc.bg)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-sm font-medium", emp.performanceScore >= 90 ? "text-emerald-400" : emp.performanceScore >= 70 ? "text-amber-400" : "text-red-400")}>{emp.performanceScore}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">{emp.hireDate}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setShowDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No employees found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f0f1e] border border-white/10 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-[#0f0f1e] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingEmployee ? "Edit Employee" : "Hire New Employee"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Hired by FU Corp badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10">
                <BadgeCheck className="w-5 h-5 text-[#FF6B00]" />
                <span className="text-sm text-white/70">Hired by <strong className="text-[#FF6B00]">FU Corp</strong> — Mother Company</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Full Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Employee name" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="employee@fu-corp.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300-1234567" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                {/* Title */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Job Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Developer" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                {/* Assign to Subsidiary */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Assign to Company *</label>
                  <select value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#0f0f1e]">{b.code} - {b.name}</option>)}
                  </select>
                </div>
                {/* Department */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Department</label>
                  <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {departments.map((d) => <option key={d} value={d} className="bg-[#0f0f1e]">{d}</option>)}
                  </select>
                </div>
                {/* Role */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Employee["role"] })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k} className="bg-[#0f0f1e]">{v}</option>)}
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {Object.entries(statusColors).map(([k, v]) => <option key={k} value={k} className="bg-[#0f0f1e]">{v.label}</option>)}
                  </select>
                </div>
                {/* Salary */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Salary (USD/mo)</label>
                  <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    placeholder="5000" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                {/* Hire Date */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Hire Date</label>
                  <input type="date" value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
              </div>

              {/* Password — only when creating new employee */}
              {!editingEmployee && (
                <div className="p-4 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10 space-y-3">
                  <p className="text-xs text-[#FF6B00] font-semibold uppercase tracking-wider">Login Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Initial Password *</label>
                      <input type="text" value={(formData as Record<string, unknown>).password as string || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value } as typeof formData)}
                        placeholder="Set login password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">PIN Code (4-digit)</label>
                      <input type="text" maxLength={4} value={(formData as Record<string, unknown>).pinCode as string || ""} onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, "").slice(0, 4) } as typeof formData)}
                        placeholder="e.g. 1234" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 font-mono tracking-widest" />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30">Employee will use these credentials to log in. They can change their password from Settings.</p>
                </div>
              )}

              {/* Skills */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="Add skill..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  <button onClick={addSkill} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all">Add</button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0f0f1e] border-t border-white/[0.06] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!formData.name || !formData.email}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingEmployee ? "Save Changes" : "Hire Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-[#0f0f1e] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Remove Employee</h3>
                <p className="text-xs text-white/40">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Are you sure you want to remove <strong className="text-white">{employeeList.find((e) => e.id === showDeleteConfirm)?.name}</strong> from FU Corp?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm transition-all hover:text-white">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm transition-all hover:bg-red-500/20 font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
