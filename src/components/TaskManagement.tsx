"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  CheckSquare,
  Clock,
  AlertCircle,
  User,
  Calendar,
  MoreVertical,
  GripVertical,
  ChevronDown,
  Flag,
  Edit,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { clsx } from "clsx";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
  assignee: string;
  client: string;
  brand: string;
  dueDate: string;
  timeSpent: number;
  subtasks: number;
  subtasksCompleted: number;
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Monthly SEO Audit Report",
    description: "Complete SEO audit for Sarah Mitchell E-Commerce",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignee: "Ahmed Khan",
    client: "Sarah Mitchell E-Commerce",
    brand: "VCS",
    dueDate: "2026-04-05",
    timeSpent: 6,
    subtasks: 3,
    subtasksCompleted: 1,
  },
  {
    id: "2",
    title: "Meta Ads Campaign Optimization",
    description: "Optimize lookalike audiences for DTC E-Commerce",
    status: "TODO",
    priority: "CRITICAL",
    assignee: "Faizan",
    client: "DTC E-Commerce Brand",
    brand: "DPL",
    dueDate: "2026-04-02",
    timeSpent: 0,
    subtasks: 5,
    subtasksCompleted: 0,
  },
  {
    id: "3",
    title: "E-Commerce Platform Migration",
    description: "Migrate TechMart to new cloud infrastructure",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignee: "Ali Raza",
    client: "TechMart",
    brand: "BSL",
    dueDate: "2026-04-08",
    timeSpent: 12,
    subtasks: 8,
    subtasksCompleted: 5,
  },
  {
    id: "4",
    title: "Banking Security Audit",
    description: "Complete security audit for SecureBank",
    status: "TODO",
    priority: "CRITICAL",
    assignee: "Hamza Ali",
    client: "SecureBank",
    brand: "BSL",
    dueDate: "2026-04-04",
    timeSpent: 0,
    subtasks: 10,
    subtasksCompleted: 0,
  },
  {
    id: "5",
    title: "AI Analytics Dashboard",
    description: "Build prediction engine for DataFlow",
    status: "REVIEW",
    priority: "HIGH",
    assignee: "Sarah Williams",
    client: "DataFlow Analytics",
    brand: "BSL",
    dueDate: "2026-04-10",
    timeSpent: 15,
    subtasks: 6,
    subtasksCompleted: 4,
  },
  {
    id: "6",
    title: "Google Ads ROAS Optimization",
    description: "Improve ROAS for B2B SaaS client",
    status: "IN_PROGRESS",
    priority: "NORMAL",
    assignee: "Anwaar",
    client: "B2B SaaS Company",
    brand: "DPL",
    dueDate: "2026-04-03",
    timeSpent: 10,
    subtasks: 4,
    subtasksCompleted: 4,
  },
  {
    id: "7",
    title: "Content Calendar Q2",
    description: "Plan Q2 content strategy for Marketing Agency",
    status: "TODO",
    priority: "NORMAL",
    assignee: "Usman Tariq",
    client: "Marketing Agency Partner",
    brand: "VCS",
    dueDate: "2026-04-06",
    timeSpent: 0,
    subtasks: 2,
    subtasksCompleted: 0,
  },
  {
    id: "8",
    title: "PPC Campaign Setup",
    description: "Set up new PPC campaigns for SaaS Startup",
    status: "DONE",
    priority: "HIGH",
    assignee: "Fatima Hassan",
    client: "SaaS Startup Client",
    brand: "VCS",
    dueDate: "2026-04-01",
    timeSpent: 5,
    subtasks: 5,
    subtasksCompleted: 5,
  },
];

const columns = [
  { id: "TODO", label: "To Do", color: "#6B7280" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#3B82F6" },
  { id: "REVIEW", label: "Review", color: "#F59E0B" },
  { id: "DONE", label: "Done", color: "#22C55E" },
];

const priorityConfig = {
  CRITICAL: { color: "#EF4444", label: "Critical" },
  HIGH: { color: "#F59E0B", label: "High" },
  NORMAL: { color: "#3B82F6", label: "Normal" },
  LOW: { color: "#6B7280", label: "Low" },
};

const employees = ["Ahmed Khan", "Ali Raza", "Faizan", "Anwaar", "Fatima Hassan", "Usman Tariq", "Hamza Ali", "Sarah Williams"];
const clients = ["Sarah Mitchell E-Commerce", "SaaS Startup Client", "Marketing Agency Partner", "TechMart", "SecureBank", "DataFlow Analytics", "DTC E-Commerce Brand", "B2B SaaS Company"];
const brands = ["VCS", "BSL", "DPL"];

interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  assignee: string;
  client: string;
  brand: string;
  dueDate: string;
}

const emptyFormData: TaskFormData = {
  title: "",
  description: "",
  priority: "NORMAL",
  assignee: "",
  client: "",
  brand: "VCS",
  dueDate: "",
};

export default function TaskManagement({ brandId = "1" }: { brandId?: string }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => {
      const matchesStatus = task.status === status;
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      return matchesStatus && matchesSearch && matchesPriority;
    });
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee: task.assignee,
        client: task.client,
        brand: task.brand,
        dueDate: task.dueDate,
      });
    } else {
      setEditingTask(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData(emptyFormData);
  };

  const handleSaveTask = () => {
    if (editingTask) {
      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: formData.title,
                description: formData.description,
                priority: formData.priority as Task["priority"],
                assignee: formData.assignee,
                client: formData.client,
                brand: formData.brand,
                dueDate: formData.dueDate,
              }
            : t
        )
      );
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        status: "TODO",
        priority: formData.priority as Task["priority"],
        assignee: formData.assignee,
        client: formData.client,
        brand: formData.brand,
        dueDate: formData.dueDate,
        timeSpent: 0,
        subtasks: 0,
        subtasksCompleted: 0,
      };
      setTasks([...tasks, newTask]);
    }
    handleCloseModal();
  };

  const handleDeleteTask = () => {
    if (deleteTaskId) {
      setTasks(tasks.filter((t) => t.id !== deleteTaskId));
      setIsDeleteModalOpen(false);
      setDeleteTaskId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Task Management</h2>
          <p className="text-white/50 mt-1">Track and manage your team's tasks with Kanban board</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {columns.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          return (
            <div
              key={col.id}
              className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs text-white/50">{col.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          <option value="all" className="bg-[#0f0f18]">All Priorities</option>
          <option value="CRITICAL" className="bg-[#0f0f18]">Critical</option>
          <option value="HIGH" className="bg-[#0f0f18]">High</option>
          <option value="NORMAL" className="bg-[#0f0f18]">Normal</option>
          <option value="LOW" className="bg-[#0f0f18]">Low</option>
        </select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className="flex flex-col bg-white/[0.02] rounded-2xl p-4 min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id as Task["status"])}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="text-sm font-medium text-white">{column.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/50">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 space-y-3">
                {columnTasks.map((task) => {
                  const priority = priorityConfig[task.priority];
                  const taskOverdue = isOverdue(task.dueDate) && task.status !== "DONE";

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4 hover:border-white/20 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      {/* Priority & Actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${priority.color}20`, color: priority.color }}
                          >
                            {priority.label}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${task.brand === "VCS" ? "#D4AF37" : task.brand === "BSL" ? "#3B82F6" : "#22C55E"}20`, color: task.brand === "VCS" ? "#D4AF37" : task.brand === "BSL" ? "#3B82F6" : "#22C55E" }}>
                            {task.brand}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(task)} className="p-1 rounded hover:bg-white/10">
                            <Edit className="w-3 h-3 text-white/60" />
                          </button>
                          <button onClick={() => { setDeleteTaskId(task.id); setIsDeleteModalOpen(true); }} className="p-1 rounded hover:bg-red-500/20">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Client */}
                      <div className="flex items-center gap-1 mb-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60">
                          {task.client}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-black text-[10px] font-bold">
                            {getInitials(task.assignee)}
                          </div>
                          <span className="text-xs text-white/60">{task.assignee.split(" ")[0]}</span>
                        </div>
                        <div className={clsx("flex items-center gap-1 text-xs", taskOverdue ? "text-red-400" : "text-white/50")}>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      </div>

                      {task.timeSpent > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
                          <Clock className="w-3 h-3" />
                          <span>{task.timeSpent}h logged</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Task Button */}
                <button
                  onClick={() => handleOpenModal()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                {editingTask ? "Edit Task" : "Add New Task"}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 min-h-[80px]"
                  placeholder="Task description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                  >
                    <option value="CRITICAL" className="bg-[#0f0f18]">Critical</option>
                    <option value="HIGH" className="bg-[#0f0f18]">High</option>
                    <option value="NORMAL" className="bg-[#0f0f18]">Normal</option>
                    <option value="LOW" className="bg-[#0f0f18]">Low</option>
                  </select>
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
                  <label className="block text-sm text-white/60 mb-2">Assignee</label>
                  <select
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                  >
                    <option value="" className="bg-[#0f0f18]">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp} value={emp} className="bg-[#0f0f18]">{emp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Client</label>
                  <select
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                  >
                    <option value="" className="bg-[#0f0f18]">Select Client</option>
                    {clients.map((client) => (
                      <option key={client} value={client} className="bg-[#0f0f18]">{client}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button onClick={handleCloseModal} className="px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!formData.title}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all disabled:opacity-50"
              >
                {editingTask ? "Update" : "Add"} Task
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
              <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Task?</h3>
              <p className="text-white/60 text-center text-sm">Are you sure you want to delete this task?</p>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-white/10">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all">Cancel</button>
              <button onClick={handleDeleteTask} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
