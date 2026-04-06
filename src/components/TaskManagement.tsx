"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, CheckSquare, Clock, AlertCircle, Calendar, Edit, Trash2,
  X, Save, Loader2, User, LayoutGrid, List,
} from "lucide-react";
import { clsx } from "clsx";
// Employees and clients fetched from API for dropdowns
import { apiMutate } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/components/CompanyContext";
import { getPriorityColor } from "@/lib/types";

const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];

interface Task {
  id: string; title: string; description: string;
  status: string; priority: string; assignee: string;
  client: string; brand: string; dueDate: string;
  timeSpent: number; subtasks: number; subtasksCompleted: number;
}

const columns = [
  { status: "TODO", label: "To Do", color: "#71717A" },
  { status: "IN_PROGRESS", label: "In Progress", color: "#3B82F6" },
  { status: "REVIEW", label: "Review", color: "#F59E0B" },
  { status: "DONE", label: "Done", color: "#10B981" },
];

const priorityOptions = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

const defaultForm = { title: "", description: "", priority: "MEDIUM", assignee: "", client: "", brand: "VCS", dueDate: "" };

export default function TaskManagement({ brandId: _brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const { activeCompany } = useCompany();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string }[]>([]);
  const [clientList, setClientList] = useState<{ id: string; companyName: string }[]>([]);

  // Fetch employees + clients for dropdowns
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployeeList(data.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          })));
        }
      })
      .catch(() => {});
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setClientList(data.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            companyName: String(c.companyName || ""),
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks?brand=${activeCompany.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Task[] = data.map((t: Record<string, unknown>) => ({
            id: String(t.id), title: String(t.title), description: String(t.description || ""),
            status: String(t.status), priority: String(t.priority),
            assignee: t.assignee ? `${(t.assignee as Record<string, string>).firstName} ${(t.assignee as Record<string, string>).lastName}`.trim() : "",
            client: (t.client as Record<string, string>)?.companyName || "",
            brand: (t.brand as Record<string, string>)?.code || "",
            dueDate: t.dueDate ? String(t.dueDate).split("T")[0] : "",
            timeSpent: Number(t.timeSpent) || 0, subtasks: 0, subtasksCompleted: 0,
          }));
          setTaskList(mapped);
        } else {
          setTaskList([]);
        }
      })
      .catch(() => { setTaskList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompany.code]);

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return taskList.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.assignee.toLowerCase().includes(q) && !t.client.toLowerCase().includes(q)) return false;
      }
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [taskList, search, filterPriority]);

  const stats = useMemo(() => ({
    total: taskList.length,
    done: taskList.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length,
    inProgress: taskList.filter((t) => t.status === "IN_PROGRESS").length,
    overdue: taskList.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "COMPLETED").length,
  }), [taskList]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (task: Task) => { setEditingId(task.id); setForm({ title: task.title, description: task.description || "", priority: task.priority, assignee: task.assignee, client: task.client, brand: task.brand, dueDate: task.dueDate }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { showError("Task title required"); return; }
    setSaving(true);
    if (editingId) {
      const result = await apiMutate(`/api/tasks/${editingId}`, "PATCH", form);
      if (!result.ok) { showError(result.error || "Failed to update task"); setSaving(false); return; }
      setTaskList((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...form } : t)));
      success("Task updated");
    } else {
      const result = await apiMutate("/api/tasks", "POST", { ...form, status: "TODO" });
      if (!result.ok) { showError(result.error || "Failed to create task"); setSaving(false); return; }
      setTaskList((prev) => [...prev, { id: String(Date.now()), ...form, status: "TODO", timeSpent: 0, subtasks: 0, subtasksCompleted: 0 }]);
      success("Task created");
    }
    setSaving(false);
    setShowModal(false);
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    const result = await apiMutate(`/api/tasks/${taskId}`, "PATCH", { status: newStatus });
    if (!result.ok) { showError(result.error || "Failed to move task"); return; }
    setTaskList((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    const col = columns.find((c) => c.status === newStatus);
    success(`Moved to ${col?.label || newStatus}`);
  };

  const handleDelete = async (id: string) => {
    const result = await apiMutate(`/api/tasks/${id}`, "DELETE");
    if (!result.ok) { showError(result.error || "Failed to delete task"); return; }
    setTaskList((prev) => prev.filter((t) => t.id !== id));
    setShowDeleteConfirm(null);
    success("Task deleted");
  };

  const isOverdue = (d: string, s: string) => d && new Date(d) < new Date() && s !== "DONE" && s !== "COMPLETED";
  const brandColor = (code: string) => brands.find((b) => b.code === code)?.color || "#FF6B00";

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CheckSquare, color: "#FF6B00" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "#3B82F6" },
          { label: "Completed", value: stats.done, icon: CheckSquare, color: "#10B981" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "#EF4444" },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              <span className="text-[11px] text-[var(--foreground-dim)]">{s.label}</span>
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="search-box flex-1">
          <Search className="w-3.5 h-3.5" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-8" />
        </div>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input-field w-auto min-w-[110px]">
          <option value="ALL">All Priority</option>
          {priorityOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="tab-list !p-0.5">
          <button onClick={() => setViewMode("kanban")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "kanban" ? "active" : ""}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "list" ? "active" : ""}`}><List className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap"><Plus className="w-4 h-4" /> New Task</button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="kanban-column p-4 space-y-3">
              <div className="flex items-center justify-between mb-2"><div className="h-3 w-20 skeleton rounded" /><div className="h-5 w-5 skeleton rounded" /></div>
              {Array.from({ length: 2 + (col % 2) }).map((_, card) => (
                <div key={card} className="kanban-card space-y-2.5">
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-3 w-1/2 skeleton rounded" />
                  <div className="flex items-center gap-2"><div className="w-5 h-5 skeleton rounded-full" /><div className="h-2.5 w-16 skeleton rounded" /></div>
                  <div className="flex items-center justify-between"><div className="h-5 w-14 skeleton rounded-full" /><div className="h-3 w-12 skeleton rounded" /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {columns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.status || (col.status === "DONE" && t.status === "COMPLETED"));
            return (
              <div key={col.status} className="kanban-column p-3">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-[12px] font-medium text-[var(--foreground)]">{col.label}</span>
                  <span className="text-[11px] text-[var(--foreground-dim)] tabular-nums">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {colTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    return (
                      <div key={task.id} className={clsx("kanban-card group", overdue && "!border-red-500/20 bg-red-500/5")}>
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-[12px] font-medium text-[var(--foreground)] flex-1 pr-2 leading-snug">{task.title}</p>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEdit(task)} className="btn-ghost p-0.5"><Edit className="w-2.5 h-2.5" /></button>
                            <button onClick={() => setShowDeleteConfirm(task.id)} className="btn-ghost p-0.5 hover:!text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className={clsx("badge text-[9px]", getPriorityColor(task.priority as "HIGH"))}>{task.priority}</span>
                          {task.brand && <span className="badge text-[9px]" style={{ color: brandColor(task.brand), backgroundColor: `${brandColor(task.brand)}10` }}>{task.brand}</span>}
                        </div>
                        {task.assignee && <p className="text-[11px] text-[var(--foreground-dim)] mb-1 flex items-center gap-1"><User className="w-3 h-3" />{task.assignee}</p>}
                        {task.dueDate && (
                          <p className={clsx("text-[10px] flex items-center gap-1", overdue ? "text-red-400" : "text-[var(--foreground-dim)]")}>
                            <Calendar className="w-2.5 h-2.5" />{task.dueDate}{overdue && <span className="text-red-400 font-medium">OVERDUE</span>}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                          {col.status === "TODO" && <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">Start</button>}
                          {col.status === "IN_PROGRESS" && (
                            <>
                              <button onClick={() => moveTask(task.id, "REVIEW")} className="flex-1 text-[10px] py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">Review</button>
                              <button onClick={() => moveTask(task.id, "DONE")} className="flex-1 text-[10px] py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Done</button>
                            </>
                          )}
                          {col.status === "REVIEW" && (
                            <>
                              <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded-md bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:bg-[var(--surface-elevated)] transition-colors">Back</button>
                              <button onClick={() => moveTask(task.id, "DONE")} className="flex-1 text-[10px] py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Approve</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-center">
                      <p className="text-[11px] text-[var(--foreground-dim)]">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th className="hidden md:table-cell">Assignee</th><th className="hidden md:table-cell">Due</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((task) => {
                const col = columns.find((c) => c.status === task.status) || columns[0];
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                  <tr key={task.id} className={overdue ? "!bg-red-500/[0.02]" : ""}>
                    <td><p className="text-[13px] font-medium text-[var(--foreground)]">{task.title}</p><p className="text-[11px] text-[var(--foreground-dim)]">{task.client}</p></td>
                    <td><span className="badge" style={{ color: col.color, backgroundColor: `${col.color}15` }}>{col.label}</span></td>
                    <td><span className={clsx("badge", getPriorityColor(task.priority as "HIGH"))}>{task.priority}</span></td>
                    <td className="hidden md:table-cell">{task.assignee || "—"}</td>
                    <td className={clsx("hidden md:table-cell", overdue && "!text-red-400")}>{task.dueDate || "—"}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => openEdit(task)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowDeleteConfirm(task.id)} className="btn-ghost p-1.5 hover:!text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{editingId ? "Edit Task" : "New Task"}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" className="input-field" /></div>
              <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." className="input-field resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">{priorityOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Assign To</label><select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="input-field"><option value="">Unassigned</option>{employeeList.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
                <div><label className="block text-[11px] text-[var(--foreground-dim)] mb-1">Client</label><select value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="input-field"><option value="">No client</option>{clientList.map((c) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}</select></div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {editingId ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-2">Delete Task</h3>
            <p className="text-[13px] text-[var(--foreground-muted)] mb-5">Delete <strong className="text-[var(--foreground)]">{taskList.find((t) => t.id === showDeleteConfirm)?.title}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-primary !bg-red-500 hover:!bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
