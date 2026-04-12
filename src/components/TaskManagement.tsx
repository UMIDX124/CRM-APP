"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, CheckSquare, Clock, AlertCircle, Calendar, Edit, Trash2,
  X, Save, Loader2, User, LayoutGrid, List, CalendarDays, Play, Square, ChevronLeft, ChevronRight,
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

// Local Task shape used by the kanban UI. Previously carried
// `subtasks` / `subtasksCompleted` fields that were always 0 and
// never rendered — dead weight, removed.
interface Task {
  id: string; title: string; description: string;
  status: string; priority: string; assignee: string;
  client: string; brand: string; dueDate: string;
  timeSpent: number;
}

const columns = [
  { status: "TODO", label: "To Do", color: "#71717A" },
  { status: "IN_PROGRESS", label: "In Progress", color: "#3B82F6" },
  { status: "REVIEW", label: "Review", color: "#F59E0B" },
  { status: "COMPLETED", label: "Done", color: "#10B981" },
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
            timeSpent: Number(t.timeSpent) || 0,
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
  const [filterDueDate, setFilterDueDate] = useState<"ALL" | "TODAY" | "WEEK" | "OVERDUE">("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Active time-tracking timer for the current user (only one at a time)
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; startedAt: string } | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  // Persist view mode per user
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tasks-view-mode");
      if (stored === "kanban" || stored === "list" || stored === "calendar") {
        setViewMode(stored);
      }
    } catch {
      /* no-op */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("tasks-view-mode", viewMode);
    } catch {
      /* no-op */
    }
  }, [viewMode]);

  // Tick every second while a timer is active so the displayed elapsed
  // time updates smoothly without a full re-fetch.
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start timer");
      }
      const data = await res.json();
      setActiveTimer({ taskId, startedAt: data.entry.startedAt });
      success("Timer started");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start timer");
    }
  };

  const stopTimer = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to stop timer");
      }
      const data = await res.json();
      const minutes = Math.max(0, Math.round((data.entry?.durationSec ?? 0) / 60));
      setActiveTimer(null);
      setTaskList((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, timeSpent: t.timeSpent + minutes / 60 } : t
        )
      );
      success(`Timer stopped — ${minutes} minute${minutes === 1 ? "" : "s"} logged`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to stop timer");
    }
  };

  // Compute the currently-displayed elapsed time (reads timerTick for reactivity)
  const elapsedForActive = useMemo(() => {
    if (!activeTimer) return 0;
    void timerTick; // force dep so re-render picks up new seconds
    const started = new Date(activeTimer.startedAt).getTime();
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
  }, [activeTimer, timerTick]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return taskList.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.assignee.toLowerCase().includes(q) && !t.client.toLowerCase().includes(q)) return false;
      }
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;

      if (filterDueDate !== "ALL") {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        const isDone = t.status === "COMPLETED";
        if (filterDueDate === "TODAY") {
          if (due < today || due >= tomorrow) return false;
        } else if (filterDueDate === "WEEK") {
          if (due < today || due >= weekEnd) return false;
        } else if (filterDueDate === "OVERDUE") {
          if (due >= today || isDone) return false;
        }
      }
      return true;
    });
  }, [taskList, search, filterPriority, filterDueDate]);

  const stats = useMemo(() => ({
    total: taskList.length,
    done: taskList.filter((t) => t.status === "COMPLETED").length,
    inProgress: taskList.filter((t) => t.status === "IN_PROGRESS").length,
    overdue: taskList.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length,
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
      setTaskList((prev) => [...prev, { id: String(Date.now()), ...form, status: "TODO", timeSpent: 0 }]);
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

  const isOverdue = (d: string, s: string) => d && new Date(d) < new Date() && s !== "COMPLETED";
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
        <select
          value={filterDueDate}
          onChange={(e) => setFilterDueDate(e.target.value as "ALL" | "TODAY" | "WEEK" | "OVERDUE")}
          className="input-field w-auto min-w-[110px]"
        >
          <option value="ALL">All Dates</option>
          <option value="TODAY">Due Today</option>
          <option value="WEEK">This Week</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <div className="tab-list !p-0.5">
          <button onClick={() => setViewMode("kanban")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "kanban" ? "active" : ""}`} title="Board"><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "list" ? "active" : ""}`} title="List"><List className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("calendar")} className={`tab-item !px-2.5 !py-1.5 ${viewMode === "calendar" ? "active" : ""}`} title="Calendar"><CalendarDays className="w-3.5 h-3.5" /></button>
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
            const colTasks = filtered.filter((t) => t.status === col.status || (col.status === "COMPLETED" && t.status === "COMPLETED"));
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
                        {(() => {
                          const isTiming = activeTimer?.taskId === task.id;
                          return (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--foreground-dim)]">
                              {isTiming ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); stopTimer(task.id); }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                  title="Stop timer"
                                >
                                  <Square className="w-2.5 h-2.5" />
                                  <span className="tabular-nums font-medium">{formatHms(elapsedForActive)}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); startTimer(task.id); }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--primary)] disabled:opacity-30"
                                  disabled={Boolean(activeTimer)}
                                  title={activeTimer ? "Another timer is running" : "Start timer"}
                                >
                                  <Play className="w-2.5 h-2.5" />
                                  {task.timeSpent > 0 && <span className="tabular-nums">{task.timeSpent.toFixed(1)}h</span>}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                          {col.status === "TODO" && <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">Start</button>}
                          {col.status === "IN_PROGRESS" && (
                            <>
                              <button onClick={() => moveTask(task.id, "REVIEW")} className="flex-1 text-[10px] py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">Review</button>
                              <button onClick={() => moveTask(task.id, "COMPLETED")} className="flex-1 text-[10px] py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Done</button>
                            </>
                          )}
                          {col.status === "REVIEW" && (
                            <>
                              <button onClick={() => moveTask(task.id, "IN_PROGRESS")} className="flex-1 text-[10px] py-1 rounded-md bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:bg-[var(--surface-elevated)] transition-colors">Back</button>
                              <button onClick={() => moveTask(task.id, "COMPLETED")} className="flex-1 text-[10px] py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Approve</button>
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
      ) : viewMode === "list" ? (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th className="hidden md:table-cell">Assignee</th><th className="hidden md:table-cell">Due</th><th className="hidden md:table-cell">Time</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((task) => {
                const col = columns.find((c) => c.status === task.status) || columns[0];
                const overdue = isOverdue(task.dueDate, task.status);
                const isTiming = activeTimer?.taskId === task.id;
                return (
                  <tr key={task.id} className={overdue ? "!bg-red-500/[0.02]" : ""}>
                    <td><p className="text-[13px] font-medium text-[var(--foreground)]">{task.title}</p><p className="text-[11px] text-[var(--foreground-dim)]">{task.client}</p></td>
                    <td><span className="badge" style={{ color: col.color, backgroundColor: `${col.color}15` }}>{col.label}</span></td>
                    <td><span className={clsx("badge", getPriorityColor(task.priority as "HIGH"))}>{task.priority}</span></td>
                    <td className="hidden md:table-cell">{task.assignee || "—"}</td>
                    <td className={clsx("hidden md:table-cell", overdue && "!text-red-400")}>{task.dueDate || "—"}</td>
                    <td className="hidden md:table-cell tabular-nums text-[12px] text-[var(--foreground-muted)]">
                      {isTiming ? (
                        <span className="text-[var(--primary)] font-medium">{formatHms(elapsedForActive)}</span>
                      ) : task.timeSpent > 0 ? (
                        `${task.timeSpent.toFixed(1)}h`
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => (isTiming ? stopTimer(task.id) : startTimer(task.id))}
                          className={clsx(
                            "btn-ghost p-1.5",
                            isTiming ? "!text-red-400" : "hover:!text-[var(--primary)]"
                          )}
                          disabled={!isTiming && Boolean(activeTimer)}
                          title={
                            isTiming
                              ? "Stop timer"
                              : activeTimer
                                ? "Another timer is running"
                                : "Start timer"
                          }
                        >
                          {isTiming ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => openEdit(task)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowDeleteConfirm(task.id)} className="btn-ghost p-1.5 hover:!text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[12px] text-[var(--foreground-dim)]">
                    No tasks match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Calendar view — monthly grid with tasks plotted on their due date */
        <CalendarView
          tasks={filtered}
          month={calendarMonth}
          setMonth={setCalendarMonth}
          onEditTask={openEdit}
          brandColor={brandColor}
        />
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

function formatHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface CalendarViewProps {
  tasks: Task[];
  month: Date;
  setMonth: (d: Date) => void;
  onEditTask: (task: Task) => void;
  brandColor: (code: string) => string;
}

function CalendarView({ tasks, month, setMonth, onEditTask, brandColor }: CalendarViewProps) {
  const monthLabel = month.toLocaleString(undefined, { month: "long", year: "numeric" });

  // Build a Sunday-start grid for the visible month. Pad with surrounding
  // days so every week row has 7 cells.
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startDow = firstOfMonth.getDay();
  const gridStart = new Date(year, monthIndex, 1 - startDow);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  // Group tasks by their due date (YYYY-MM-DD) for O(1) lookup per cell
  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = t.dueDate;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const goPrev = () => setMonth(new Date(year, monthIndex - 1, 1));
  const goNext = () => setMonth(new Date(year, monthIndex + 1, 1));
  const goToday = () =>
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const unscheduled = tasks.filter((t) => !t.dueDate);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="btn-ghost p-1.5" title="Previous month">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <h3 className="text-[13px] font-semibold text-[var(--foreground)] min-w-[140px] text-center">
            {monthLabel}
          </h3>
          <button onClick={goNext} className="btn-ghost p-1.5" title="Next month">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={goToday} className="btn-secondary text-[11px]">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-wider text-[var(--foreground-dim)] text-center py-2 border-r border-[var(--border-subtle)] last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const inMonth = cell.getMonth() === monthIndex;
          const key = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
          const dayTasks = byDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={clsx(
                "min-h-[92px] border-r border-b border-[var(--border-subtle)] last:border-r-0 p-1.5",
                !inMonth && "bg-[var(--background)]/40"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={clsx(
                    "text-[11px] tabular-nums",
                    isToday
                      ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-black font-semibold"
                      : inMonth
                        ? "text-[var(--foreground)]"
                        : "text-[var(--foreground-dim)]"
                  )}
                >
                  {cell.getDate()}
                </span>
                {dayTasks.length > 2 && (
                  <span className="text-[9px] text-[var(--foreground-dim)]">{dayTasks.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onEditTask(t)}
                    className="w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80"
                    style={{
                      backgroundColor: `${brandColor(t.brand)}15`,
                      color: brandColor(t.brand),
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] text-[var(--foreground-dim)] px-1">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-dim)] mb-2">
            Unscheduled ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                onClick={() => onEditTask(t)}
                className="text-[11px] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"
                title={t.title}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
