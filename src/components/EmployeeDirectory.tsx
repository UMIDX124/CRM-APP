"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Users,
  Mail,
  Phone,
  MapPin,
  Star,
  MoreVertical,
  ChevronRight,
  Briefcase,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  X,
  Save,
  UserPlus,
} from "lucide-react";
import { clsx } from "clsx";

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  title: string;
  department: string;
  brand: string;
  performanceScore: number;
  availability: "AVAILABLE" | "BUSY" | "ON_LEAVE";
  skills: string[];
  workload: number;
  tasksCompleted: number;
  totalTasks: number;
}

const initialEmployees: Employee[] = [
  {
    id: "1",
    name: "Faizan",
    email: "faizan@digitalpointllc.com",
    avatar: null,
    title: "Co-Founder",
    department: "LEADERSHIP",
    brand: "DPL",
    performanceScore: 98,
    availability: "AVAILABLE",
    skills: ["Media Buying", "Meta", "Google", "YouTube", "Attribution"],
    workload: 85,
    tasksCompleted: 52,
    totalTasks: 55,
  },
  {
    id: "2",
    name: "Anwaar",
    email: "anwaar@digitalpointllc.com",
    avatar: null,
    title: "Co-Founder",
    department: "LEADERSHIP",
    brand: "DPL",
    performanceScore: 97,
    availability: "AVAILABLE",
    skills: ["Performance Marketing", "Analytics", "Scaling", "Attribution"],
    workload: 80,
    tasksCompleted: 48,
    totalTasks: 52,
  },
  {
    id: "3",
    name: "Ahmed Khan",
    email: "ahmed.khan@vcs.pk",
    avatar: null,
    title: "Senior SEO Manager",
    department: "MARKETING",
    brand: "VCS",
    performanceScore: 94,
    availability: "AVAILABLE",
    skills: ["SEO", "Google Analytics", "Content Strategy"],
    workload: 78,
    tasksCompleted: 47,
    totalTasks: 50,
  },
  {
    id: "4",
    name: "Ali Raza",
    email: "ali.raza@vcs.pk",
    avatar: null,
    title: "Full Stack Developer",
    department: "DEV",
    brand: "VCS",
    performanceScore: 96,
    availability: "AVAILABLE",
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    workload: 65,
    tasksCompleted: 52,
    totalTasks: 55,
  },
  {
    id: "5",
    name: "Hamza Ali",
    email: "hamza@backupsolutions.pk",
    avatar: null,
    title: "DevOps Engineer",
    department: "DEV",
    brand: "BSL",
    performanceScore: 92,
    availability: "BUSY",
    skills: ["AWS", "Docker", "CI/CD", "Security"],
    workload: 88,
    tasksCompleted: 33,
    totalTasks: 38,
  },
  {
    id: "6",
    name: "Sarah Williams",
    email: "sarah@backupsolutions.pk",
    avatar: null,
    title: "AI Engineer",
    department: "DEV",
    brand: "BSL",
    performanceScore: 95,
    availability: "AVAILABLE",
    skills: ["ML Models", "Python", "TensorFlow", "Data Science"],
    workload: 75,
    tasksCompleted: 45,
    totalTasks: 48,
  },
  {
    id: "7",
    name: "Fatima Hassan",
    email: "fatima.h@vcs.pk",
    avatar: null,
    title: "PPC Specialist",
    department: "MARKETING",
    brand: "VCS",
    performanceScore: 88,
    availability: "BUSY",
    skills: ["Google Ads", "Facebook Ads", "Analytics"],
    workload: 92,
    tasksCompleted: 38,
    totalTasks: 42,
  },
  {
    id: "8",
    name: "Usman Tariq",
    email: "usman.t@vcs.pk",
    avatar: null,
    title: "Social Media Manager",
    department: "MARKETING",
    brand: "VCS",
    performanceScore: 87,
    availability: "AVAILABLE",
    skills: ["Instagram", "LinkedIn", "Content Creation"],
    workload: 70,
    tasksCompleted: 29,
    totalTasks: 35,
  },
];

const departments = ["All", "LEADERSHIP", "MARKETING", "WORKFORCE", "DEV", "SUPPORT", "OPS"];
const brands = ["All", "VCS", "BSL", "DPL"];

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

const availabilityConfig = {
  AVAILABLE: { color: "#22C55E", label: "Available" },
  BUSY: { color: "#F59E0B", label: "Busy" },
  ON_LEAVE: { color: "#6B7280", label: "On Leave" },
};

interface EmployeeFormData {
  name: string;
  email: string;
  title: string;
  department: string;
  brand: string;
  availability: string;
  skills: string;
}

const emptyFormData: EmployeeFormData = {
  name: "",
  email: "",
  title: "",
  department: "DEV",
  brand: "VCS",
  availability: "AVAILABLE",
  skills: "",
};

export default function EmployeeDirectory({ brandId = "1" }: { brandId?: string }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterBrand, setFilterBrand] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDepartment === "All" || emp.department === filterDepartment;
    const matchesBrand = filterBrand === "All" || emp.brand === filterBrand;
    return matchesSearch && matchesDept && matchesBrand;
  });

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        title: employee.title,
        department: employee.department,
        brand: employee.brand,
        availability: employee.availability,
        skills: employee.skills.join(", "),
      });
    } else {
      setEditingEmployee(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData(emptyFormData);
  };

  const handleSaveEmployee = () => {
    const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);

    if (editingEmployee) {
      setEmployees(
        employees.map((e) =>
          e.id === editingEmployee.id
            ? {
                ...e,
                name: formData.name,
                email: formData.email,
                title: formData.title,
                department: formData.department,
                brand: formData.brand,
                availability: formData.availability as Employee["availability"],
                skills: skillsArray,
              }
            : e
        )
      );
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        avatar: null,
        title: formData.title,
        department: formData.department,
        brand: formData.brand,
        performanceScore: 75,
        availability: formData.availability as Employee["availability"],
        skills: skillsArray,
        workload: 50,
        tasksCompleted: 0,
        totalTasks: 10,
      };
      setEmployees([...employees, newEmployee]);
    }
    handleCloseModal();
  };

  const handleDeleteEmployee = () => {
    if (deleteEmployeeId) {
      setEmployees(employees.filter((e) => e.id !== deleteEmployeeId));
      setIsDeleteModalOpen(false);
      setDeleteEmployeeId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Employee Directory</h2>
          <p className="text-white/50 mt-1">Manage your team members and their performance</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/20">
              <Users className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{employees.length}</p>
              <p className="text-xs text-white/50">Total Employees</p>
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
                {employees.filter((e) => e.availability === "AVAILABLE").length}
              </p>
              <p className="text-xs text-white/50">Available Now</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {employees.filter((e) => e.availability === "BUSY").length}
              </p>
              <p className="text-xs text-white/50">Busy</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <Star className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(employees.reduce((sum, e) => sum + e.performanceScore, 0) / employees.length)}%
              </p>
              <p className="text-xs text-white/50">Avg Performance</p>
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
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept} className="bg-[#0f0f18]">
              {dept === "All" ? "All Departments" : dept}
            </option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
        >
          {brands.map((brand) => (
            <option key={brand} value={brand} className="bg-[#0f0f18]">
              {brand === "All" ? "All Brands" : brand}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={clsx(
              "px-3 py-2 rounded-lg text-sm transition-all",
              viewMode === "grid" ? "bg-[#D4AF37] text-black" : "text-white/60 hover:text-white"
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={clsx(
              "px-3 py-2 rounded-lg text-sm transition-all",
              viewMode === "list" ? "bg-[#D4AF37] text-black" : "text-white/60 hover:text-white"
            )}
          >
            List
          </button>
        </div>
      </div>

      {/* Employee Grid/List */}
      <div className={clsx(
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "space-y-3"
      )}>
        {filteredEmployees.map((employee) => {
          const brandColor = brandColors[employee.brand] || "#D4AF37";
          const availConfig = availabilityConfig[employee.availability];

          return (
            <div
              key={employee.id}
              className={clsx(
                "rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-white/20 transition-all group",
                viewMode === "list" && "flex items-center gap-4 p-4"
              )}
            >
              {viewMode === "grid" ? (
                <div className="p-5">
                  {/* Avatar & Basic Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-black font-bold text-lg">
                          {employee.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f0f18]"
                          style={{ backgroundColor: availConfig.color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">
                          {employee.name}
                        </p>
                        <p className="text-xs text-white/50">{employee.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(employee)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteEmployeeId(employee.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-400/60" />
                      </button>
                    </div>
                  </div>

                  {/* Brand & Department */}
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                    >
                      {employee.brand}
                    </span>
                    <span className="text-white/30 text-xs">|</span>
                    <span className="text-xs text-white/50">{employee.department}</span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {employee.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Performance */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Performance</span>
                      <span className="text-sm font-semibold text-[#D4AF37]">{employee.performanceScore}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${employee.performanceScore}%`,
                          backgroundColor: brandColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">
                        {employee.tasksCompleted}/{employee.totalTasks} tasks
                      </span>
                      <span
                        className="px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${availConfig.color}20`, color: availConfig.color }}
                      >
                        {availConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* List View */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-black font-bold text-sm">
                      {employee.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f0f18]"
                      style={{ backgroundColor: availConfig.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{employee.name}</p>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                      >
                        {employee.brand}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{employee.title} | {employee.department}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-[#D4AF37]">{employee.performanceScore}%</p>
                      <p className="text-xs text-white/50">Performance</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(employee)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteEmployeeId(employee.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400/60" />
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="e.g. Senior Developer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                  >
                    <option value="LEADERSHIP" className="bg-[#0f0f18]">Leadership</option>
                    <option value="MARKETING" className="bg-[#0f0f18]">Marketing</option>
                    <option value="DEV" className="bg-[#0f0f18]">Development</option>
                    <option value="WORKFORCE" className="bg-[#0f0f18]">Workforce</option>
                    <option value="SUPPORT" className="bg-[#0f0f18]">Support</option>
                    <option value="OPS" className="bg-[#0f0f18]">Operations</option>
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
              <div>
                <label className="block text-sm text-white/60 mb-2">Availability</label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 cursor-pointer"
                >
                  <option value="AVAILABLE" className="bg-[#0f0f18]">Available</option>
                  <option value="BUSY" className="bg-[#0f0f18]">Busy</option>
                  <option value="ON_LEAVE" className="bg-[#0f0f18]">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Skills (comma separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  placeholder="React, Node.js, AWS"
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
                onClick={handleSaveEmployee}
                disabled={!formData.name || !formData.email || !formData.title}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-medium hover:bg-[#E5C158] transition-all disabled:opacity-50"
              >
                {editingEmployee ? "Update" : "Add"} Employee
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
              <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Employee?</h3>
              <p className="text-white/60 text-center text-sm">
                Are you sure you want to delete this employee? This action cannot be undone.
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
                onClick={handleDeleteEmployee}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
