// Mock data for FU Corp Command Center CRM
// FU Corp = Mother Company | VCS, BSL, DPL = Daughter Companies
// All employees hired by FU Corp, assigned to subsidiaries

export const parentCompany = {
  id: "0",
  name: "FU Corp",
  code: "FU",
  color: "#FF6B00",
  website: "fu-corp.com",
  tagline: "Enterprise Command Center",
  founded: "2023",
  ceo: "Faizan & Umer",
};

export const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00", website: "virtualcustomersolution.com", companyId: "fu" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6", website: "backup-solutions.vercel.app", companyId: "fu" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E", website: "digitalpointllc.com", companyId: "fu" },
];

export const departments = [
  { id: "1", name: "Marketing", code: "MARKETING" },
  { id: "2", name: "Workforce", code: "WORKFORCE" },
  { id: "3", name: "Development", code: "DEV" },
  { id: "4", name: "Support", code: "SUPPORT" },
  { id: "5", name: "Operations", code: "OPS" },
];

export const countries = [
  { name: "United States", code: "US", flag: "US" },
  { name: "United Kingdom", code: "UK", flag: "UK" },
  { name: "Germany", code: "DE", flag: "DE" },
  { name: "Canada", code: "CA", flag: "CA" },
  { name: "Australia", code: "AU", flag: "AU" },
  { name: "UAE", code: "AE", flag: "AE" },
  { name: "Pakistan", code: "PK", flag: "PK" },
  { name: "India", code: "IN", flag: "IN" },
  { name: "Brazil", code: "BR", flag: "BR" },
  { name: "Singapore", code: "SG", flag: "SG" },
];

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "PROBATION";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "REMOTE" | "LEAVE";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  title: string;
  department: string;
  brand: string; // Daughter company assigned to
  hiredBy: string; // Always "FU" — mother company hires
  role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "DEPT_HEAD" | "TEAM_LEAD" | "EMPLOYEE";
  status: EmployeeStatus;
  hireDate: string;
  salary: number;
  currency: string;
  performanceScore: number;
  availability: "AVAILABLE" | "BUSY" | "ON_LEAVE" | "OFFLINE";
  skills: string[];
  workload: number;
  tasksCompleted: number;
  totalTasks: number;
  address?: string;
  emergencyContact?: string;
}

export const employees: Employee[] = [
  // FU Corp Leadership (works across all subsidiaries)
  {
    id: "1", name: "Faizan", email: "faizi@digitalpointllc.com", phone: "+92 300-1234567",
    avatar: null, title: "Co-Founder & CEO", department: "LEADERSHIP", brand: "DPL",
    hiredBy: "FU", role: "SUPER_ADMIN", status: "ACTIVE", hireDate: "2023-01-15",
    salary: 15000, currency: "USD", performanceScore: 98, availability: "AVAILABLE",
    skills: ["Media Buying", "Meta", "Google", "YouTube", "Attribution", "Strategy"],
    workload: 85, tasksCompleted: 52, totalTasks: 55,
  },
  {
    id: "2", name: "Umer", email: "umi@digitalpointllc.com", phone: "+92 300-7654321",
    avatar: null, title: "Co-Founder & CTO", department: "LEADERSHIP", brand: "DPL",
    hiredBy: "FU", role: "SUPER_ADMIN", status: "ACTIVE", hireDate: "2023-01-15",
    salary: 15000, currency: "USD", performanceScore: 97, availability: "AVAILABLE",
    skills: ["Performance Marketing", "Analytics", "Scaling", "Attribution", "Tech"],
    workload: 80, tasksCompleted: 48, totalTasks: 52,
  },
  // VCS Team
  {
    id: "3", name: "Ahmed Khan", email: "ahmed.khan@vcs.pk", phone: "+92 321-5551234",
    avatar: null, title: "Senior SEO Manager", department: "MARKETING", brand: "VCS",
    hiredBy: "FU", role: "TEAM_LEAD", status: "ACTIVE", hireDate: "2023-06-10",
    salary: 4500, currency: "USD", performanceScore: 94, availability: "AVAILABLE",
    skills: ["SEO", "Google Analytics", "Content Strategy"],
    workload: 78, tasksCompleted: 47, totalTasks: 50,
  },
  {
    id: "4", name: "Ali Hassan", email: "ali@digitalpointllc.com", phone: "+92 333-5559876",
    avatar: null, title: "Full Stack Developer", department: "DEV", brand: "VCS",
    hiredBy: "FU", role: "PROJECT_MANAGER", status: "ACTIVE", hireDate: "2023-04-20",
    salary: 5500, currency: "USD", performanceScore: 96, availability: "AVAILABLE",
    skills: ["React", "Node.js", "PostgreSQL", "AWS", "Next.js"],
    workload: 65, tasksCompleted: 52, totalTasks: 55,
  },
  {
    id: "5", name: "Fatima Hassan", email: "fatima.h@vcs.pk", phone: "+92 345-5553333",
    avatar: null, title: "PPC Specialist", department: "MARKETING", brand: "VCS",
    hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE", hireDate: "2024-01-08",
    salary: 3000, currency: "USD", performanceScore: 88, availability: "BUSY",
    skills: ["Google Ads", "Facebook Ads", "Analytics"],
    workload: 92, tasksCompleted: 38, totalTasks: 42,
  },
  {
    id: "6", name: "Usman Tariq", email: "usman.t@vcs.pk", phone: "+92 300-5554444",
    avatar: null, title: "Social Media Manager", department: "MARKETING", brand: "VCS",
    hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE", hireDate: "2024-03-15",
    salary: 2500, currency: "USD", performanceScore: 87, availability: "AVAILABLE",
    skills: ["Instagram", "LinkedIn", "Content Creation", "TikTok"],
    workload: 70, tasksCompleted: 29, totalTasks: 35,
  },
  // BSL Team
  {
    id: "7", name: "Hamza Ali", email: "hamza@backupsolutions.pk", phone: "+92 311-5552222",
    avatar: null, title: "DevOps Engineer", department: "DEV", brand: "BSL",
    hiredBy: "FU", role: "TEAM_LEAD", status: "ACTIVE", hireDate: "2023-08-01",
    salary: 5000, currency: "USD", performanceScore: 92, availability: "BUSY",
    skills: ["AWS", "Docker", "CI/CD", "Security", "Kubernetes"],
    workload: 88, tasksCompleted: 33, totalTasks: 38,
  },
  {
    id: "8", name: "Sarah Williams", email: "sarah@backupsolutions.pk", phone: "+1 555-5551111",
    avatar: null, title: "AI Engineer", department: "DEV", brand: "BSL",
    hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE", hireDate: "2024-02-01",
    salary: 6000, currency: "USD", performanceScore: 95, availability: "AVAILABLE",
    skills: ["ML Models", "Python", "TensorFlow", "Data Science", "LLMs"],
    workload: 75, tasksCompleted: 45, totalTasks: 48,
  },
  {
    id: "9", name: "Bilal Rashid", email: "bilal@vcs.pk", phone: "+92 322-5556666",
    avatar: null, title: "Video Editor", department: "CREATIVE", brand: "VCS",
    hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE", hireDate: "2024-06-01",
    salary: 2000, currency: "USD", performanceScore: 85, availability: "AVAILABLE",
    skills: ["Premiere Pro", "After Effects", "Motion Graphics"],
    workload: 60, tasksCompleted: 22, totalTasks: 28,
  },
  {
    id: "10", name: "Zainab Malik", email: "zainab@digitalpointllc.com", phone: "+92 315-5557777",
    avatar: null, title: "Graphic Designer", department: "CREATIVE", brand: "DPL",
    hiredBy: "FU", role: "EMPLOYEE", status: "ACTIVE", hireDate: "2024-04-10",
    salary: 2200, currency: "USD", performanceScore: 90, availability: "AVAILABLE",
    skills: ["Figma", "Photoshop", "Illustrator", "UI/UX"],
    workload: 72, tasksCompleted: 35, totalTasks: 40,
  },
  {
    id: "11", name: "Owais Ahmed", email: "owais@backupsolutions.pk", phone: "+92 302-5558888",
    avatar: null, title: "Support Lead", department: "SUPPORT", brand: "BSL",
    hiredBy: "FU", role: "TEAM_LEAD", status: "ACTIVE", hireDate: "2023-11-20",
    salary: 3500, currency: "USD", performanceScore: 86, availability: "AVAILABLE",
    skills: ["Customer Support", "Zendesk", "Troubleshooting", "Documentation"],
    workload: 68, tasksCompleted: 41, totalTasks: 45,
  },
  {
    id: "12", name: "Nadia Khan", email: "nadia@vcs.pk", phone: "+92 331-5559999",
    avatar: null, title: "HR Manager", department: "ADMIN", brand: "VCS",
    hiredBy: "FU", role: "DEPT_HEAD", status: "ACTIVE", hireDate: "2023-09-01",
    salary: 4000, currency: "USD", performanceScore: 91, availability: "AVAILABLE",
    skills: ["Recruitment", "HR Policy", "Payroll", "Training"],
    workload: 55, tasksCompleted: 30, totalTasks: 32,
  },
];

// Attendance Records
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  hoursWorked: number;
  notes?: string;
}

// Generate attendance for last 7 days
const generateAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date("2026-04-02");

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    employees.forEach((emp) => {
      if (isWeekend) return;
      const rand = Math.random();
      let status: AttendanceStatus;
      let checkIn: string | null = null;
      let checkOut: string | null = null;
      let hours = 0;

      if (rand < 0.7) {
        status = "PRESENT";
        checkIn = `09:0${Math.floor(Math.random() * 10)}`;
        checkOut = dayOffset === 0 ? null : `18:${10 + Math.floor(Math.random() * 20)}`;
        hours = dayOffset === 0 ? 0 : 8 + Math.random() * 1.5;
      } else if (rand < 0.8) {
        status = "REMOTE";
        checkIn = `09:${15 + Math.floor(Math.random() * 15)}`;
        checkOut = dayOffset === 0 ? null : `17:${30 + Math.floor(Math.random() * 30)}`;
        hours = dayOffset === 0 ? 0 : 7.5 + Math.random();
      } else if (rand < 0.88) {
        status = "LATE";
        checkIn = `10:${Math.floor(Math.random() * 30)}`;
        checkOut = dayOffset === 0 ? null : `18:${30 + Math.floor(Math.random() * 30)}`;
        hours = dayOffset === 0 ? 0 : 7 + Math.random();
      } else if (rand < 0.94) {
        status = "LEAVE";
        hours = 0;
      } else {
        status = "ABSENT";
        hours = 0;
      }

      records.push({
        id: `att-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        checkIn,
        checkOut,
        status,
        hoursWorked: Math.round(hours * 10) / 10,
      });
    });
  }
  return records;
};

export const attendanceRecords: AttendanceRecord[] = generateAttendance();

export const clients = [
  // VCS Clients
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
  // Backup Solutions Clients
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
  // Digital Point Clients
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

export const tasks = [
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
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    assignee: "Faizan",
    client: "DTC E-Commerce Brand",
    brand: "DPL",
    dueDate: "2026-04-02",
    timeSpent: 8,
    subtasks: 5,
    subtasksCompleted: 2,
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
    status: "IN_PROGRESS",
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
    status: "REVIEW",
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
    status: "TODO",
    priority: "HIGH",
    assignee: "Fatima Hassan",
    client: "SaaS Startup Client",
    brand: "VCS",
    dueDate: "2026-04-07",
    timeSpent: 0,
    subtasks: 5,
    subtasksCompleted: 0,
  },
];

export const leads = [
  {
    id: "1",
    companyName: "Singapore FinTech",
    contactName: "David Tan",
    email: "david@sgfintech.sg",
    country: "Singapore",
    countryFlag: "SG",
    services: ["Web Development", "AI Modeling"],
    source: "Website - BSL",
    status: "PROPOSAL_SENT",
    value: 8500,
    salesRep: "Hamza Ali",
    createdAt: "2026-03-20",
  },
  {
    id: "2",
    companyName: "London Legal Services",
    contactName: "James Wilson",
    email: "james@llsolicitors.co.uk",
    country: "United Kingdom",
    countryFlag: "UK",
    services: ["Remote Workforce", "Virtual Assistants"],
    source: "LinkedIn - VCS",
    status: "NEGOTIATION",
    value: 4200,
    salesRep: "Ali Raza",
    createdAt: "2026-03-18",
  },
  {
    id: "3",
    companyName: "Lead Gen Agency",
    contactName: "Jennifer Walsh",
    email: "jennifer@leadgenagency.com",
    country: "United States",
    countryFlag: "US",
    services: ["Performance Marketing", "Attribution"],
    source: "Referral - DPL",
    status: "QUALIFIED",
    value: 15000,
    salesRep: "Faizan",
    createdAt: "2026-03-25",
  },
  {
    id: "4",
    companyName: "Tokyo Tech Ventures",
    contactName: "Yuki Tanaka",
    email: "yuki@tokyotech.jp",
    country: "Japan",
    countryFlag: "JP",
    services: ["Cloud Solutions", "AI Modeling"],
    source: "Website - BSL",
    status: "NEW",
    value: 12000,
    salesRep: "Sarah Williams",
    createdAt: "2026-03-29",
  },
  {
    id: "5",
    companyName: "Cape Town Logistics",
    contactName: "Thabo Molefe",
    email: "thabo@ctl.co.za",
    country: "South Africa",
    countryFlag: "ZA",
    services: ["Web Architecture", "Digital Marketing"],
    source: "Website - VCS",
    status: "WON",
    value: 5600,
    salesRep: "Ahmed Khan",
    createdAt: "2026-03-10",
  },
  {
    id: "6",
    companyName: "Toronto E-Commerce",
    contactName: "Mike Johnson",
    email: "mike@toronto-ecom.ca",
    country: "Canada",
    countryFlag: "CA",
    services: ["Performance Marketing", "E-Commerce"],
    source: "Cold Outreach - DPL",
    status: "LOST",
    value: 8000,
    salesRep: "Anwaar",
    createdAt: "2026-03-05",
  },
];

export const activities = [
  {
    id: "1",
    type: "task_completed",
    title: "Task Completed",
    message: "Faizan completed 'Meta Campaign Optimization' for DTC E-Commerce",
    time: "5 minutes ago",
    icon: "check",
  },
  {
    id: "2",
    type: "lead_won",
    title: "New Client Won",
    message: "Cape Town Logistics signed up for web architecture services",
    time: "2 hours ago",
    icon: "trophy",
  },
  {
    id: "3",
    type: "invoice_paid",
    title: "Invoice Paid",
    message: "SecureBank paid invoice #INV-2026-045 - $25,000",
    time: "3 hours ago",
    icon: "dollar",
  },
  {
    id: "4",
    type: "client_update",
    title: "Client Update",
    message: "B2B SaaS Company achieved +89% pipeline increase",
    time: "4 hours ago",
    icon: "star",
  },
  {
    id: "5",
    type: "campaign_launch",
    title: "Campaign Launch",
    message: "New Google Ads campaign launched for DTC E-Commerce - $12,400/mo",
    time: "5 hours ago",
    icon: "rocket",
  },
  {
    id: "6",
    type: "security_audit",
    title: "Security Audit",
    message: "SecureBank passed all security protocols - Zero breaches maintained",
    time: "8 hours ago",
    icon: "shield",
  },
  {
    id: "7",
    type: "ai_deployment",
    title: "AI Deployment",
    message: "DataFlow Analytics dashboard deployed with 98% accuracy",
    time: "1 day ago",
    icon: "cpu",
  },
  {
    id: "8",
    type: "performance_report",
    title: "Performance Report",
    message: "Marketing Agency achieved 5 to 16 clients milestone",
    time: "1 day ago",
    icon: "chart",
  },
];

export const revenueData = [
  { month: "Oct", vcs: 85000, bsl: 65000, dpl: 55000 },
  { month: "Nov", vcs: 92000, bsl: 72000, dpl: 62000 },
  { month: "Dec", vcs: 88000, bsl: 68000, dpl: 58000 },
  { month: "Jan", vcs: 105000, bsl: 85000, dpl: 78000 },
  { month: "Feb", vcs: 112000, bsl: 92000, dpl: 95000 },
  { month: "Mar", vcs: 118000, bsl: 98000, dpl: 124890 },
];

export const serviceTypes = [
  { name: "Performance Marketing", revenue: 185000, percentage: 32, color: "#22C55E" },
  { name: "Web Architecture", revenue: 142000, percentage: 24, color: "#3B82F6" },
  { name: "Remote Workforce", revenue: 98000, percentage: 17, color: "#FF6B00" },
  { name: "AI & Analytics", revenue: 85000, percentage: 15, color: "#F59E0B" },
  { name: "Cloud & Security", revenue: 72000, percentage: 12, color: "#F59E0B" },
];

export const currentUser = {
  id: "1",
  name: "Admin User",
  email: "admin@fu-corp.pk",
  role: "SUPER_ADMIN",
  avatar: null,
};

// Dashboard KPIs - Combined from all 3 companies
export const dashboardKPIs = {
  totalActiveClients: 200,
  revenueThisMonth: 340890,
  openTasks: 147,
  employeeUtilization: 82,
  totalAdSpendManaged: 50000000,
  averageROAS: 4.2,
  auditsDelivered: 200,
};
