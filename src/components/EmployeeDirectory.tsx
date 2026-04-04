"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Users, Mail, Phone, Edit, Trash2, X, Save,
  UserPlus, Building2, Shield, LayoutGrid, List, BadgeCheck, AlertTriangle, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { employees as mockEmployees, brands, parentCompany } from "@/data/mock-data";
import type { Employee, EmployeeStatus } from "@/data/mock-data";
import { apiMutate } from "@/lib/use-data";
import { useToast } from "@/components/ui/toast";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", PROJECT_MANAGER: "Project Manager",
  DEPT_HEAD: "Dept Head", TEAM_LEAD: "Team Lead", EMPLOYEE: "Employee",
};

const statusColors: Record<EmployeeStatus, { label: string; bg: string }> = {
  ACTIVE: { label: "Active", bg: "bg-emerald-500/10 text-emerald-400" },
  ON_LEAVE: { label: "On Leave", bg: "bg-amber-500/10 text-amber-400" },
  TERMINATED: { label: "Terminated", bg: "bg-red-500/10 text-red-400" },
  PROBATION: { label: "Probation", bg: "bg-cyan-500/10 text-cyan-400" },
};

const departments = ["LEADERSHIP", "MARKETING", "DEV", "CREATIVE", "SUPPORT", "ADMIN", "SALES", "OPS"];

const defaultForm = {
  name: "", email: "", phone: "", title: "", department: "DEV",
  brand: "VCS", role: "EMPLOYEE" as Employee["role"], status: "ACTIVE" as EmployeeStatus,
  hireDate: new Date().toISOString().split("T")[0], salary: 0, password: "", pinCode: "",
  skills: [] as string[],
};

export default function EmployeeDirectory({ brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const [employeeList, setEmployeeList] = useState<Employee[]>(mockEmployees);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let m = true;
    fetch("/api/employees").then(r => r.ok ? r.json() : null).then(data => {
      if (m && data && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((e: Record<string, unknown>) => ({
          id: e.id, name: `${e.firstName} ${e.lastName}`.trim(), email: e.email,
          phone: (e.phone as string) || "", avatar: null, title: (e.title as string) || "",
          department: (e.department as string) || "DEV",
          brand: (e.brand as Record<string,string>)?.code || "",
          hiredBy: "FU", role: (e.role as string) || "EMPLOYEE",
          status: (e.status as string) || "ACTIVE", hireDate: (e.hireDate as string) || "",
          salary: (e.salary as number) || 0, currency: "USD",
          performanceScore: 85, availability: "AVAILABLE",
          skills: (e.skills as string[]) || [], workload: 50,
          tasksCompleted: 0, totalTasks: 0,
        })) as Employee[];
        setEmployeeList(mapped);
      }
    }).catch(() => {});
    return () => { m = false; };
  }, []);

  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const filtered = useMemo(() => {
    return employeeList.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q) && !e.title.toLowerCase().includes(q)) return false;
      }
      if (filterBrand !== "ALL" && e.brand !== filterBrand) return false;
      if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
      return true;
    });
  }, [employeeList, search, filterBrand, filterStatus]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name, email: emp.email, phone: emp.phone || "",
      title: emp.title, department: emp.department, brand: emp.brand,
      role: emp.role, status: emp.status, hireDate: emp.hireDate,
      salary: emp.salary, password: "", pinCode: "", skills: emp.skills || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showError("Name is required"); return; }
    if (!form.email.trim()) { showError("Email is required"); return; }
    if (!form.title.trim()) { showError("Job title is required"); return; }
    if (!editingId && !form.password) { showError("Password is required for new employees"); return; }

    setSaving(true);

    if (editingId) {
      // Update existing
      const result = await apiMutate(`/api/employees/${editingId}`, "PATCH", {
        firstName: form.name.split(" ")[0], lastName: form.name.split(" ").slice(1).join(" "),
        email: form.email, phone: form.phone, title: form.title,
        department: form.department, brandId: form.brand, role: form.role,
        status: form.status, salary: form.salary, skills: form.skills,
      });
      // Update local state
      setEmployeeList((prev) => prev.map((e) => e.id === editingId ? { ...e, ...form } : e));
      success("Employee updated");
    } else {
      // Create new
      const result = await apiMutate("/api/employees", "POST", {
        firstName: form.name.split(" ")[0], lastName: form.name.split(" ").slice(1).join(" "),
        email: form.email, phone: form.phone, title: form.title,
        department: form.department, brandId: form.brand, role: form.role,
        salary: form.salary, skills: form.skills, hireDate: form.hireDate,
        password: form.password,
      });
      // Add to local state
      const newEmp: Employee = {
        id: String(Date.now()), name: form.name, email: form.email, phone: form.phone,
        avatar: null, title: form.title, department: form.department, brand: form.brand,
        hiredBy: "FU", role: form.role, status: "ACTIVE", hireDate: form.hireDate,
        salary: form.salary, currency: "USD", performanceScore: 0, availability: "AVAILABLE",
        skills: form.skills, workload: 0, tasksCompleted: 0, totalTasks: 0,
      };
      setEmployeeList((prev) => [...prev, newEmp]);
      success(`${form.name} hired successfully!`);
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await apiMutate(`/api/employees/${id}`, "DELETE");
    setEmployeeList((prev) => prev.filter((e) => e.id !== id));
    setShowDeleteConfirm(null);
    success("Employee removed");
  };

  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  const stats = useMemo(() => ({
    total: employeeList.length,
    active: employeeList.filter((e) => e.status === "ACTIVE").length,
    avgPerf: employeeList.length > 0 ? Math.round(employeeList.reduce((a, e) => a + e.performanceScore, 0) / employeeList.length) : 0,
  }), [employeeList]);

  return (
    <div className="space-y-6">
      {/* Header — big clear CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-[10px] font-bold tracking-wider">{parentCompany.code} CORP</span>
            <span className="text-white/30 text-xs">{stats.total} employees &bull; {stats.active} active</span>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-bold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all">
          <UserPlus className="w-5 h-5" />
          Hire New Employee
        </button>
      </div>

      {/* Quick stats per company */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {brands.map((b) => (
          <div key={b.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-xs text-white/50">{b.code}</span>
            </div>
            <p className="text-2xl font-bold text-white">{employeeList.filter((e) => e.brand === b.code && e.status === "ACTIVE").length}</p>
            <p className="text-xs text-white/40">active staff</p>
          </div>
        ))}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3 h-3 text-[#FF6B00]" />
            <span className="text-xs text-white/50">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-white/40">all companies</p>
        </div>
      </div>

      {/* Filters — simple row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search name, email, or title..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#111114]">All Companies</option>
          {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#111114]">{b.code}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#111114]">All Status</option>
          {Object.entries(statusColors).map(([k, v]) => <option key={k} value={k} className="bg-[#111114]">{v.label}</option>)}
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

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
              <div className="skeleton h-12 w-12 rounded-xl" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm mb-4">{search ? "No employees match your search" : "No employees yet"}</p>
          <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-sm font-medium">
            <UserPlus className="w-4 h-4 inline mr-2" />Hire your first employee
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => {
            const sc = statusColors[emp.status];
            return (
              <div key={emp.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all hover-lift group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-white/80">{emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setShowDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-0.5">{emp.name}</h3>
                <p className="text-xs text-white/50 mb-3">{emp.title}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ color: brandColor(emp.brand), borderColor: brandColor(emp.brand) + "30", backgroundColor: brandColor(emp.brand) + "10" }}>{emp.brand}</span>
                  <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-medium", sc.bg)}>{sc.label}</span>
                </div>
                <div className="space-y-1.5 text-xs text-white/40">
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" /><span className="truncate">{emp.email}</span></div>
                  <div className="flex items-center gap-2"><Building2 className="w-3 h-3" /><span>{emp.department}</span></div>
                  <div className="flex items-center gap-2"><Shield className="w-3 h-3" /><span>{roleLabels[emp.role]}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/40">Performance</span>
                    <span className={clsx("font-medium", emp.performanceScore >= 90 ? "text-emerald-400" : emp.performanceScore >= 70 ? "text-amber-400" : "text-red-400")}>{emp.performanceScore}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${emp.performanceScore}%`, backgroundColor: emp.performanceScore >= 90 ? "#10B981" : emp.performanceScore >= 70 ? "#F59E0B" : "#EF4444" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
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
                        <div><p className="text-sm font-medium text-white">{emp.name}</p><p className="text-xs text-white/40">{emp.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: brandColor(emp.brand), backgroundColor: brandColor(emp.brand) + "10" }}>{emp.brand}</span></td>
                    <td className="px-4 py-3 text-sm text-white/60">{emp.title}</td>
                    <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-medium", sc.bg)}>{sc.label}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setShowDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ HIRE / EDIT MODAL — Clean, step-by-step ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111114] border border-white/10 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[#111114] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Employee" : "Hire New Employee"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* FU Corp badge */}
              {!editingId && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10">
                  <BadgeCheck className="w-5 h-5 text-[#FF6B00]" />
                  <span className="text-sm text-white/70">Hired by <strong className="text-[#FF6B00]">FU Corp</strong></span>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">Basic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Full Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ahmed Khan" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="ahmed@fu-corp.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+92 300-1234567" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Job Title *</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Senior Developer" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div>
                <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">Company Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Assign to Company *</label>
                    <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                      {brands.map((b) => <option key={b.code} value={b.code} className="bg-[#111114]">{b.code} - {b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Department</label>
                    <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                      {departments.map((d) => <option key={d} value={d} className="bg-[#111114]">{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                      {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k} className="bg-[#111114]">{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Salary (USD/mo)</label>
                    <input type="number" value={form.salary || ""} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                      placeholder="5000" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                  </div>
                </div>
              </div>

              {/* Login Credentials — only for new */}
              {!editingId && (
                <div>
                  <p className="text-xs text-[#FF6B00] font-medium uppercase tracking-wider mb-3">Login Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Password *</label>
                      <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Set password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">PIN (4-digit)</label>
                      <input type="text" maxLength={4} value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="1234" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 font-mono tracking-widest" />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/20 mt-2">Employee will use these to log in. They can change password from Settings.</p>
                </div>
              )}

              {/* Skills */}
              <div>
                <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">Skills</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                      {s}
                      <button onClick={() => setForm({ ...form, skills: form.skills.filter((sk) => sk !== s) })} className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newSkill.trim() && !form.skills.includes(newSkill.trim())) { setForm({ ...form, skills: [...form.skills, newSkill.trim()] }); setNewSkill(""); } } }}
                    placeholder="Add skill + Enter" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#111114] border-t border-white/[0.06] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save Changes" : "Hire Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <div><h3 className="text-white font-semibold">Remove Employee</h3><p className="text-xs text-white/40">This cannot be undone</p></div>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Remove <strong className="text-white">{employeeList.find((e) => e.id === showDeleteConfirm)?.name}</strong> from FU Corp?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
