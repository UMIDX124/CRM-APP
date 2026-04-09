// Shared types for Alpha CRM — single source of truth
// All components, API routes, and mock data conform to these types

export type Role = "SUPER_ADMIN" | "PROJECT_MANAGER" | "DEPT_HEAD" | "TEAM_LEAD" | "EMPLOYEE";
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "PROBATION";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED" | "BLOCKED";
export type Priority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL" | "URGENT";
export type ClientStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type LeadStatus = "NEW" | "QUALIFIED" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "REMOTE" | "LEAVE";
export type Availability = "AVAILABLE" | "BUSY" | "ON_LEAVE" | "OFFLINE";
export type HealthStatus = "HEALTHY" | "AT_RISK" | "CRITICAL";

export interface Brand {
  id: string;
  name: string;
  code: string;
  color: string;
  website: string;
  companyId: string | null;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  title: string;
  department: string;
  brand: string;
  hiredBy: string;
  role: Role;
  status: EmployeeStatus;
  hireDate: string;
  salary: number;
  currency: string;
  performanceScore: number;
  availability: Availability;
  skills: string[];
  workload: number;
  tasksCompleted: number;
  totalTasks: number;
  address?: string;
  emergencyContact?: string;
}

export interface Client {
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
  healthStatus: HealthStatus;
  services: string[];
  activeTasks: number;
  lastActivity: string;
  result?: string;
  source?: string;
  lastContactDate?: string;
  nextFollowUp?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  client: string;
  brand: string;
  dueDate: string;
  timeSpent: number;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  countryFlag: string;
  services: string[];
  source: string;
  status: LeadStatus;
  value: number;
  salesRep: string;
  createdAt: string;
  brand?: string;
  score?: number;
  phone?: string;
  notes?: string;
  probability?: number;
  expectedClose?: string;
  lastContactDate?: string;
  nextContactDate?: string;
  nextAction?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  brand: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  paidDate?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  hoursWorked: number;
  notes?: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: string;
}

export interface DashboardKPIs {
  totalRevenue: number;
  revenueTrend: number;
  activeClients: number;
  clientsTrend: number;
  teamMembers: number;
  teamTrend: number;
  tasksCompleted: number;
  totalTasks: number;
  tasksTrend: number;
  openLeads: number;
  pipelineValue: number;
  avgHealthScore: number;
}

// Helper to extract brand from lead source string (e.g., "Website - BSL" → "BSL")
export function extractBrandFromSource(source: string): string {
  const parts = source.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1] : "VCS";
}

// Format currency
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

// Priority color mapping
export function getPriorityColor(priority: Priority): string {
  const map: Record<string, string> = {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
    URGENT: "text-red-400 bg-red-500/10 border-red-500/20",
    HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    NORMAL: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    LOW: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  };
  return map[priority] || map.NORMAL;
}

// Status color mapping
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "text-emerald-400 bg-emerald-500/10",
    HEALTHY: "text-emerald-400 bg-emerald-500/10",
    PRESENT: "text-emerald-400 bg-emerald-500/10",
    COMPLETED: "text-emerald-400 bg-emerald-500/10",
    PAID: "text-emerald-400 bg-emerald-500/10",
    WON: "text-emerald-400 bg-emerald-500/10",
    IN_PROGRESS: "text-blue-400 bg-blue-500/10",
    REVIEW: "text-amber-400 bg-amber-500/10",
    PROPOSAL_SENT: "text-amber-400 bg-amber-500/10",
    NEGOTIATION: "text-amber-400 bg-amber-500/10",
    QUALIFIED: "text-cyan-400 bg-cyan-500/10",
    NEW: "text-sky-400 bg-sky-500/10",
    TODO: "text-zinc-400 bg-zinc-500/10",
    PENDING: "text-amber-400 bg-amber-500/10",
    DRAFT: "text-zinc-400 bg-zinc-500/10",
    OVERDUE: "text-red-400 bg-red-500/10",
    CANCELLED: "text-zinc-500 bg-zinc-500/10",
    AT_RISK: "text-amber-400 bg-amber-500/10",
    CRITICAL: "text-red-400 bg-red-500/10",
    PAUSED: "text-zinc-400 bg-zinc-500/10",
    BLOCKED: "text-red-400 bg-red-500/10",
    LOST: "text-red-400 bg-red-500/10",
    LATE: "text-amber-400 bg-amber-500/10",
    REMOTE: "text-blue-400 bg-blue-500/10",
    HALF_DAY: "text-orange-400 bg-orange-500/10",
    LEAVE: "text-zinc-400 bg-zinc-500/10",
    ABSENT: "text-red-400 bg-red-500/10",
    ON_LEAVE: "text-zinc-400 bg-zinc-500/10",
    TERMINATED: "text-red-400 bg-red-500/10",
    PROBATION: "text-amber-400 bg-amber-500/10",
  };
  return map[status] || "text-zinc-400 bg-zinc-500/10";
}
