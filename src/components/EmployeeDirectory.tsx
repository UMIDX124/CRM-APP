"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Users, Mail, Edit, Trash2, X, Save,
  UserPlus, Building2, Shield, LayoutGrid, List, BadgeCheck, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import type { Employee, EmployeeStatus, Role } from "@/lib/types";
import { apiMutate } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getStatusColor } from "@/lib/types";

const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", PROJECT_MANAGER: "Project Manager",
  DEPT_HEAD: "Dept Head", TEAM_LEAD: "Team Lead", EMPLOYEE: "Employee",
};

const departments = ["LEADERSHIP", "MARKETING", "DEV", "CREATIVE", "SUPPORT", "ADMIN", "SALES", "OPS"];

const defaultForm = {
  name: "", email: "", phone: "", title: "", department: "DEV",
  brand: "VCS", role: "EMPLOYEE" as Role, status: "ACTIVE" as EmployeeStatus,
  hireDate: new Date().toISOString().split("T")[0], salary: 0, password: "", pinCode: "",
  skills: [] as string[],
};

export default function EmployeeDirectory({ brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Employee[] = data.map((e: Record<string, unknown>) => ({
            id: String(e.id), name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            email: String(e.email || ""), phone: String(e.phone || ""), avatar: null,
            title: String(e.title || ""), department: String(e.department || "DEV"),
            brand: (e.brand as Record<string, string>)?.code || String(e.brand || ""),
            hiredBy: "FU", role: String(e.role || "EMPLOYEE") as Role,
            status: String(e.status || "ACTIVE") as EmployeeStatus,
            hireDate: String(e.hireDate || ""), salary: Number(e.salary) || 0, currency: "USD",
            performanceScore: 85, availability: "AVAILABLE" as const,
            skills: Array.isArray(e.skills) ? (e.skills as string[]) : [],
            workload: 50, tasksCompleted: 0, totalTasks: 0,
          }));
          setEmployeeList(mapped);
        } else {
          setEmployeeList([]);
        }
      })
      .catch(() => { setEmployeeList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };

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
      const result = await apiMutate(`/api/employees/${editingId}`, "PATCH", {
        firstName: form.name.split(" ")[0], lastName: form.name.split(" ").slice(1).join(" "),
        email: form.email, phone: form.phone, title: form.title,
        department: form.department, brandId: form.brand, role: form.role,
        status: form.status, salary: form.salary, skills: form.skills,
      });
      if (!result.ok) { showError(result.error || "Failed to update employee"); setSaving(false); return; }
      setEmployeeList((prev) => prev.map((e) => e.id === editingId ? { ...e, name: form.name, email: form.email, phone: form.phone, title: form.title, department: form.department, brand: form.brand, role: form.role, status: form.status, salary: form.salary, skills: form.skills } : e));
      success("Employee updated");
    } else {
      const result = await apiMutate("/api/employees", "POST", {
        firstName: form.name.split(" ")[0], lastName: form.name.split(" ").slice(1).join(" "),
        email: form.email, phone: form.phone, title: form.title,
        department: form.department, brandId: form.brand, role: form.role,
        salary: form.salary, skills: form.skills, hireDate: form.hireDate,
        password: form.password,
      });
      if (!result.ok) { showError(result.error || "Failed to hire employee"); setSaving(false); return; }
      const newEmp: Employee = {
        id: String(Date.now()), name: form.name, email: form.email, phone: form.phone,
        avatar: null, title: form.title, department: form.department, brand: form.brand,
        hiredBy: "FU", role: form.role, status: "ACTIVE", hireDate: form.hireDate,
        salary: form.salary, currency: "USD", performanceScore: 0, availability: "AVAILABLE",
        skills: form.skills, workload: 0, tasksCompleted: 0, totalTasks: 0,
      };
      setEmployeeList((prev) => [...prev, newEmp]);
      success(`${form.name} hired`);
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const result = await apiMutate(`/api/employees/${id}`, "DELETE");
    if (!result.ok) { showError(result.error || "Failed to remove employee"); return; }
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

  const perfColor = (s: number) => s >= 90 ? "#10B981" : s >= 70 ? "#F59E0B" : "#EF4444";

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {brands.map((b) => (
          <div key={b.id} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-[11px] text-[var(--foreground-dim)]">{b.code}</span>
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">
              {employeeList.filter((e) => e.brand === b.code && e.status === "ACTIVE").length}
            </p>
            <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5">active staff</p>
          </div>
        ))}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="text-[11px] text-[var(--foreground-dim)]">Total</span>
          </div>
          <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{stats.total}</p>
          <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5">all companies</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="search-box flex-1">
          <Search className="w-3.5 h-3.5" />
          <input type="text" placeholder="Search name, email, or title..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-8" />
        </div>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="input-field w-auto min-w-[110px]">
          <option value="ALL">All Brands</option>
          {brands.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-auto min-w-[110px]">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
          <option value="PROBATION">Probation</option>
        </select>
        <div className="tab-list !p-0.5">
          <button onClick={() => setViewMode("grid")} className={`tab-item !px-2 !py-1.5 ${viewMode === "grid" ? "active" : ""}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`tab-item !px-2 !py-1.5 ${viewMode === "list" ? "active" : ""}`}><List className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          <UserPlus className="w-4 h-4" /> Hire
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="flex-1 space-y-1.5"><div className="h-4 w-3/4 skeleton rounded" /><div className="h-3 w-1/2 skeleton rounded" /></div>
              </div>
              <div className="space-y-2 pt-2"><div className="h-3 w-full skeleton rounded" /><div className="h-3 w-2/3 skeleton rounded" /></div>
              <div className="flex items-center justify-between pt-2"><div className="h-5 w-16 skeleton rounded-full" /><div className="h-3 w-12 skeleton rounded" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-[13px] mb-3">{search ? "No employees match" : "No employees yet"}</p>
          <button onClick={openAdd} className="btn-secondary"><UserPlus className="w-3.5 h-3.5" /> Hire first employee</button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((emp) => (
            <div key={emp.id} className="card p-4 card-interactive group">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-semibold"
                  style={{ backgroundColor: `${brandColor(emp.brand)}15`, color: brandColor(emp.brand) }}
                >
                  {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(emp)} className="btn-ghost p-1"><Edit className="w-3 h-3" /></button>
                  <button onClick={() => setShowDeleteConfirm(emp.id)} className="btn-ghost p-1 hover:!text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <h3 className="text-[13px] font-medium text-[var(--foreground)] mb-0.5">{emp.name}</h3>
              <p className="text-[11px] text-[var(--foreground-dim)] mb-2">{emp.title}</p>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="badge" style={{ color: brandColor(emp.brand), backgroundColor: `${brandColor(emp.brand)}10`, borderColor: `${brandColor(emp.brand)}20` }}>{emp.brand}</span>
                <span className={clsx("badge", getStatusColor(emp.status))}>{emp.status}</span>
              </div>
              <div className="space-y-1 text-[11px] text-[var(--foreground-dim)]">
                <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{emp.email}</span></div>
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /><span>{emp.department}</span></div>
                <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /><span>{roleLabels[emp.role] || emp.role}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[var(--foreground-dim)]">Performance</span>
                  <span className="font-medium tabular-nums" style={{ color: perfColor(emp.performanceScore) }}>{emp.performanceScore}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${emp.performanceScore}%`, backgroundColor: perfColor(emp.performanceScore) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Brand</th>
                <th className="hidden md:table-cell">Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor: `${brandColor(emp.brand)}12`, color: brandColor(emp.brand) }}>
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0"><p className="text-[13px] font-medium text-[var(--foreground)] truncate">{emp.name}</p><p className="text-[11px] text-[var(--foreground-dim)] truncate">{emp.email}</p></div>
                    </div>
                  </td>
                  <td><span className="badge" style={{ color: brandColor(emp.brand), backgroundColor: `${brandColor(emp.brand)}10` }}>{emp.brand}</span></td>
                  <td className="hidden md:table-cell text-[var(--foreground-muted)]">{emp.title}</td>
                  <td><span className={clsx("badge", getStatusColor(emp.status))}>{emp.status}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEdit(emp)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setShowDeleteConfirm(emp.id)} className="btn-ghost p-1.5 hover:!text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hire/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{editingId ? "Edit Employee" : "Hire Employee"}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {!editingId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                  <BadgeCheck className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-[12px] text-[var(--foreground-muted)]">Hired by <strong className="text-[var(--primary)]">Alpha</strong></span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Full Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Khan" className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ahmed@fu-corp.com" className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300-1234567" className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Job Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Developer" className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Brand</label><select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field">{brands.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Department</label><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field">{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input-field">{Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Salary (USD/mo)</label><input type="number" value={form.salary || ""} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} placeholder="5000" className="input-field" /></div>
              </div>
              {!editingId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-[11px] text-[var(--primary)] mb-1">Password *</label><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set password" className="input-field" /></div>
                  <div><label className="block text-[11px] text-[var(--primary)] mb-1">PIN (4-digit)</label><input type="text" maxLength={4} value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" className="input-field font-mono tracking-widest" /></div>
                </div>
              )}
              <div>
                <label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Skills</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.skills.map((s) => (
                    <span key={s} className="badge bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">{s}<button onClick={() => setForm({ ...form, skills: form.skills.filter((sk) => sk !== s) })} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button></span>
                  ))}
                </div>
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newSkill.trim() && !form.skills.includes(newSkill.trim())) { setForm({ ...form, skills: [...form.skills, newSkill.trim()] }); setNewSkill(""); } } }} placeholder="Add skill + Enter" className="input-field" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingId ? "Save" : "Hire"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-2">Remove Employee</h3>
            <p className="text-[13px] text-[var(--foreground-muted)] mb-5">
              Remove <strong className="text-[var(--foreground)]">{employeeList.find((e) => e.id === showDeleteConfirm)?.name}</strong> from Alpha?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-primary !bg-red-500 hover:!bg-red-600">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
