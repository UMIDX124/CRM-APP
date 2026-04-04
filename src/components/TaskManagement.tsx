"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, CheckSquare, Clock, AlertCircle, Calendar, Edit, Trash2,
  X, Save, Loader2, AlertTriangle, ArrowRight, Flag, User,
} from "lucide-react";
import { clsx } from "clsx";
import { tasks as mockTasks, brands, employees, clients } from "@/data/mock-data";
import { apiMutate } from "@/lib/use-data";
import { useToast } from "@/components/ui/toast";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "COMPLETED";
type TaskPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "MEDIUM" | "URGENT";

interface Task {
  id: string; title: string; description: string;
  status: string; priority: string; assignee: string;
  client: string; brand: string; dueDate: string;
  timeSpent: number; subtasks: number; subtasksCompleted: number;
}

const columns = [
  { status: "TODO", label: "To Do", color: "#71717A", icon: Clock },
  { status: "IN_PROGRESS", label: "In Progress", color: "#3B82F6", icon: AlertCircle },
  { status: "REVIEW", label: "Review", color: "#F59E0B", icon: CheckSquare },
  { status: "DONE", label: "Done", color: "#10B981", icon: CheckSquare },
];

const priorityColors: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Critical" },
  URGENT: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Urgent" },
  HIGH: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "High" },
  NORMAL: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Normal" },
  MEDIUM: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Medium" },
  LOW: { color: "text-white/40", bg: "bg-white/5 border-white/10", label: "Low" },
};

const defaultForm = {
  title: "", description: "", priority: "MEDIUM", assignee: "", client: "", brand: "VCS", dueDate: "",
};

export default function TaskManagement({ brandId }: { brandId: string }) {
  const { success, error: showError } = useToast();
  const [taskList, setTaskList] = useState<Task[]>(mockTasks as unknown as Task[]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let m = true;
    fetch("/api/tasks").then(r => r.ok ? r.json() : null).then(data => {
      if (m && data && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((t: Record<string, unknown>) => ({
          id: t.id, title: t.title, description: (t.description as string) || "",
          status: t.status, priority: t.priority,
          assignee: t.assignee ? `${(t.assignee as Record<string,string>).firstName} ${(t.assignee as Record<string,string>).lastName}`.trim() : "",
          client: (t.client as Record<string,string>)?.companyName || "",
          brand: (t.brand as Record<string,string>)?.code || "",
          dueDate: t.dueDate ? String(t.dueDate).split("T")[0] : "",
          timeSpent: (t.timeSpent as number) || 0, subtasks: 0, subtasksCompleted: 0,
        })) as Task[];
        setTaskList(mapped);
      }
    }).catch(() => {});
    return () => { m = false; };
  }, []);

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
    done: taskList.filter(t => t.status === "DONE" || t.status === "COMPLETED").length,
    inProgress: taskList.filter(t => t.status === "IN_PROGRESS").length,
    overdue: taskList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "COMPLETED").length,
  }), [taskList]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title, description: task.description || "",
      priority: task.priority, assignee: task.assignee, client: task.client,
      brand: task.brand, dueDate: task.dueDate,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showError("Task title required"); return; }
    setSaving(true);
    if (editingId) {
      await apiMutate(`/api/tasks/${editingId}`, "PATCH", form);
      setTaskList((prev) => prev.map((t) => t.id === editingId ? { ...t, ...form } : t));
      success("Task updated");
    } else {
      await apiMutate("/api/tasks", "POST", { ...form, status: "TODO" });
      setTaskList((prev) => [...prev, {
        id: String(Date.now()), ...form, status: "TODO", timeSpent: 0, subtasks: 0, subtasksCompleted: 0,
      }]);
      success("Task created!");
    }
    setSaving(false);
    setShowModal(false);
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await apiMutate(`/api/tasks/${taskId}`, "PATCH", { status: newStatus });
    setTaskList((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    const col = columns.find(c => c.status === newStatus);
    success(`Task moved to ${col?.label || newStatus}`);
  };

  const handleDelete = async (id: string) => {
    await apiMutate(`/api/tasks/${id}`, "DELETE");
    setTaskList((prev) => prev.filter((t) => t.id !== id));
    setShowDeleteConfirm(null);
    success("Task deleted");
  };

  const isOverdue = (dueDate: string, status: string) => dueDate && new Date(dueDate) < new Date() && status !== "DONE" && status !== "COMPLETED";
  const brandColor = (code: string) => brands.find(b => b.code === code)?.color || "#FF6B00";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, icon: CheckSquare, color: "#FF6B00" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "#3B82F6" },
          { label: "Completed", value: stats.done, icon: CheckSquare, color: "#10B981" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "#EF4444" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2"><s.icon className="w-4 h-4" style={{ color: s.color }} /><span className="text-xs text-white/50">{s.label}</span></div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search tasks, assignee, client..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
        </div>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 cursor-pointer">
          <option value="ALL" className="bg-[#111114]">All Priority</option>
          {Object.entries(priorityColors).map(([k, v]) => <option key={k} value={k} className="bg-[#111114]">{v.label}</option>)}
        </select>
        <div className="flex gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          <button onClick={() => setViewMode("kanban")} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "kanban" ? "bg-white/10 text-white" : "text-white/40")}>Kanban</button>
          <button onClick={() => setViewMode("list")} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "list" ? "bg-white/10 text-white" : "text-white/40")}>List</button>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-bold text-sm">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}</div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = filtered.filter(t => t.status === col.status || (col.status === "DONE" && t.status === "COMPLETED"));
            return (
              <div key={col.status}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-medium text-white">{col.label}</span>
                  <span className="text-xs text-white/30">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colTasks.map((task) => {
                    const pCfg = priorityColors[task.priority] || priorityColors.MEDIUM;
                    const overdue = isOverdue(task.dueDate, task.status);
                    return (
                      <div key={task.id} className={clsx("p-3 rounded-xl border transition-all group hover:border-white/[0.12]",
                        overdue ? "bg-red-500/5 border-red-500/10" : "bg-white/[0.03] border-white/[0.06]"
                      )}>
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-sm font-medium text-white flex-1 pr-2">{task.title}</p>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEdit(task)} className="p-1 rounded hover:bg-white/10 text-white/30"><Edit className="w-3 h-3" /></button>
                            <button onClick={() => setShowDeleteConfirm(task.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold border", pCfg.bg)}><span className={pCfg.color}>{pCfg.label}</span></span>
                          {task.brand && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ color: brandColor(task.brand), backgroundColor: brandColor(task.brand) + "10" }}>{task.brand}</span>}
                        </div>
                        {task.assignee && <p className="text-xs text-white/40 mb-1 flex items-center gap-1"><User className="w-3 h-3" />{task.assignee}</p>}
                        {task.dueDate && (
                          <p className={clsx("text-xs flex items-center gap-1", overdue ? "text-red-400" : "text-white/30")}>
                            <Calendar className="w-3 h-3" />{task.dueDate}
                            {overdue && <span className="text-red-400 font-medium ml-1">OVERDUE</span>}
                          </p>
                        )}
                        {/* Move buttons */}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-white/[0.04]">
                          {col.status === "TODO" && <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">Start</button>}
                          {col.status === "IN_PROGRESS" && (
                            <>
                              <button onClick={() => moveTask(task.id, "REVIEW")} className="flex-1 text-[10px] py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">Review</button>
                              <button onClick={() => moveTask(task.id, "DONE")} className="flex-1 text-[10px] py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Done</button>
                            </>
                          )}
                          {col.status === "REVIEW" && (
                            <>
                              <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 transition-all">Back</button>
                              <button onClick={() => moveTask(task.id, "DONE")} className="flex-1 text-[10px] py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Approve</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="p-6 rounded-xl border border-dashed border-white/[0.06] text-center">
                      <p className="text-xs text-white/20">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List */
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Task</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Due</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const pCfg = priorityColors[task.priority] || priorityColors.MEDIUM;
                const col = columns.find(c => c.status === task.status) || columns[0];
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                  <tr key={task.id} className={clsx("border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors", overdue && "bg-red-500/[0.02]")}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-white/40">{task.client}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color: col.color, backgroundColor: col.color + "15" }}>{col.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold border", pCfg.bg)}><span className={pCfg.color}>{pCfg.label}</span></span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50 hidden md:table-cell">{task.assignee}</td>
                    <td className={clsx("px-4 py-3 text-sm hidden md:table-cell", overdue ? "text-red-400" : "text-white/50")}>{task.dueDate || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setShowDeleteConfirm(task.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111114] border border-white/10 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-[#111114] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Task" : "New Task"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Task Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs to be done?" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Details..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    {Object.entries(priorityColors).map(([k, v]) => <option key={k} value={k} className="bg-[#111114]">{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Assign To</label>
                  <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    <option value="" className="bg-[#111114]">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.name} className="bg-[#111114]">{e.name} — {e.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Client</label>
                  <select value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    <option value="" className="bg-[#111114]">No client</option>
                    {clients.map(c => <option key={c.id} value={c.companyName} className="bg-[#111114]">{c.companyName}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[#111114] border-t border-white/[0.06] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div><h3 className="text-white font-semibold">Delete Task</h3></div>
            <p className="text-sm text-white/60 mb-6">Delete <strong className="text-white">{taskList.find(t => t.id === showDeleteConfirm)?.title}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
