"use client";

import { useState } from "react";
import {
  Book, Download, ChevronRight, Search, LayoutDashboard, Building2, Users,
  CheckSquare, Briefcase, ClipboardCheck, FileText, BarChart3, Settings,
  Shield, CalendarDays, Hash, MessageCircle, Command, Bell, LogIn, Key,
  Printer, ChevronDown, HelpCircle, Zap, Globe,
} from "lucide-react";
import { clsx } from "clsx";

interface Section {
  id: string;
  title: string;
  icon: typeof Book;
  content: GuideContent[];
}

interface GuideContent {
  heading: string;
  text: string;
  steps?: string[];
  tip?: string;
}

const sections: Section[] = [
  {
    id: "getting-started", title: "Getting Started", icon: Zap,
    content: [
      { heading: "Welcome to FU Corp CRM", text: "FU Corp Command Center is your enterprise CRM for managing clients, employees, tasks, invoices, and business operations across all FU Corp subsidiary companies (VCS, BSL, DPL)." },
      { heading: "Logging In", text: "Navigate to the login page and enter your credentials. Your admin will provide your email and initial password when you're hired.",
        steps: ["Go to the CRM login page", "Enter your email address", "Enter your password", "Click 'Sign In'"],
        tip: "You can change your password anytime from Settings > Security." },
      { heading: "First Time Setup", text: "After your first login, we recommend:",
        steps: ["Go to Settings and update your profile information", "Change your default password to something secure", "Familiarize yourself with the sidebar navigation", "Try Ctrl+K to open the command palette for quick navigation"] },
    ]
  },
  {
    id: "dashboard", title: "Dashboard", icon: LayoutDashboard,
    content: [
      { heading: "Dashboard Overview", text: "The Dashboard gives you a real-time overview of your business. You'll see KPI cards showing total revenue, active clients, team members, and task completion rates." },
      { heading: "Revenue Chart", text: "The revenue chart shows monthly performance across all three brands (VCS, BSL, DPL) with color-coded lines. Hover over data points to see exact values." },
      { heading: "Activity Feed", text: "Recent activity is shown on the right side — task completions, new deals, invoice payments, and more. Click 'View All' to see the full activity log." },
      { heading: "Time Range Filter", text: "Use the 7d / 30d / 90d buttons to switch between different time periods for the dashboard data.",
        tip: "The dashboard auto-refreshes data. Brand selector in the top-right lets you filter by subsidiary." },
    ]
  },
  {
    id: "clients", title: "Client Management", icon: Building2,
    content: [
      { heading: "Viewing Clients", text: "The Clients page shows all your clients with their company name, contact person, MRR (Monthly Recurring Revenue), health score, and assigned brand." },
      { heading: "Adding a Client", text: "Click the '+ Add Client' button to create a new client record.",
        steps: ["Click '+ Add Client'", "Fill in company name, contact name, email", "Select the brand (VCS/BSL/DPL)", "Set the client status and country", "Enter the MRR value", "Click 'Save'"] },
      { heading: "Filtering & Searching", text: "Use the search bar to find clients by name or email. Use the dropdown filters to filter by brand, status, or country." },
      { heading: "Viewing Client Details", text: "Click the eye icon on any client row to open the detail view showing all information: contact details, company assignment, MRR, health score, services, and results achieved." },
      { heading: "Client Health Score", text: "Each client has a health score (0-100) with a visual progress bar. Green (80+) = healthy, Amber (50-79) = needs attention, Red (below 50) = at risk.",
        tip: "Click the edit icon to update a client's health score and MRR as the relationship evolves." },
    ]
  },
  {
    id: "employees", title: "Team / Employee Management", icon: Users,
    content: [
      { heading: "Employee Directory", text: "The Team page shows all employees hired by FU Corp, organized by subsidiary assignment. Switch between grid and list views using the toggle buttons." },
      { heading: "Hiring a New Employee", text: "Only admins and managers can hire new employees.",
        steps: ["Click 'Hire Employee'", "Enter the employee's name, email, and phone", "Set their job title, department, and role", "Assign them to a subsidiary (VCS/BSL/DPL)", "Set their salary and hire date", "Set their initial login password and 4-digit PIN", "Add their skills", "Click 'Hire Employee'"],
        tip: "All employees are hired by FU Corp (parent company) and assigned to subsidiaries." },
      { heading: "Editing an Employee", text: "Hover over any employee card to see the edit and delete icons. Click the pencil icon to edit their details." },
      { heading: "Removing an Employee", text: "Click the trash icon on an employee card. A confirmation dialog will appear. This marks them as terminated.",
        tip: "Terminated employees can still be found by filtering by 'Terminated' status." },
    ]
  },
  {
    id: "attendance", title: "Attendance System", icon: ClipboardCheck,
    content: [
      { heading: "Daily Attendance View", text: "The attendance page shows daily check-in/check-out records for all employees. Navigate between days using the arrow buttons." },
      { heading: "Monthly View", text: "Switch to Monthly view to see a heatmap grid showing each employee's attendance for the entire month. Colored dots indicate status: green=present, cyan=remote, amber=late, red=absent, amber=leave." },
      { heading: "Date Range Report", text: "The Date Range view lets you select any start and end date to get aggregate attendance statistics per employee — total present, remote, late, absent, leave days, and average hours." },
      { heading: "Self Check-In", text: "Go to Attendance > Check In. Click the 'Check In Now' button when you arrive. Click 'Check Out' when you leave. The system tracks your hours automatically.",
        steps: ["Navigate to Attendance > Check In", "Click 'Check In Now' — your time is recorded", "When leaving, click 'Check Out'", "Your hours are calculated automatically"] },
      { heading: "Admin Attendance Marking", text: "Managers can mark attendance for any employee (useful for non-tech staff like peons, office boys).",
        steps: ["Go to Attendance > Check In", "Switch to 'Admin Panel' tab", "Select the employee from the dropdown", "Choose action: Check In, Check Out, Leave, or Absent", "Click 'Mark Attendance'"] },
      { heading: "PIN Kiosk", text: "For office entrance check-in, use the PIN Kiosk at /kiosk. Each employee has a 4-digit PIN. Place a tablet at the entrance.",
        steps: ["Open /kiosk on a tablet browser", "Employee enters their 4-digit PIN on the numpad", "Press GO to check in", "Success screen shows their name and check-in time"],
        tip: "PIN codes are assigned when hiring. First employee = 1000, second = 1001, etc." },
      { heading: "CSV Export", text: "Click 'Export CSV' on the attendance page to download attendance data as a spreadsheet." },
    ]
  },
  {
    id: "tasks", title: "Task Management", icon: CheckSquare,
    content: [
      { heading: "Task Board (Kanban)", text: "Tasks are displayed on a kanban board with 4 columns: TODO, In Progress, Review, and Done. Each card shows the task title, assignee, priority, due date, and overdue indicator." },
      { heading: "Creating a Task", text: "Click 'New Task' to create a task.",
        steps: ["Click 'New Task' button", "Enter task title (required) and description", "Set priority: Critical, Urgent, High, Medium, or Low", "Assign to an employee from the dropdown", "Link to a client (optional)", "Set due date", "Click 'Create Task'"],
        tip: "Overdue tasks are highlighted in red with an OVERDUE badge." },
      { heading: "Moving Tasks Between Stages", text: "Each task card has move buttons at the bottom to transition between stages.",
        steps: ["TODO: click 'Start' to move to In Progress", "In Progress: click 'Review' or 'Done'", "Review: click 'Approve' (moves to Done) or 'Back' (returns to In Progress)"],
        tip: "You can also switch to List view for a table-based view of all tasks." },
      { heading: "Task Priorities", text: "CRITICAL/URGENT = red (immediate action), HIGH = amber (today), MEDIUM = blue (this week), LOW = gray (when available)." },
    ]
  },
  {
    id: "pipeline", title: "Sales Pipeline", icon: Briefcase,
    content: [
      { heading: "Pipeline Overview", text: "The pipeline shows all sales leads organized by stage. Stats at the top show total leads, pipeline value, won value, and win rate percentage." },
      { heading: "Pipeline Stages", text: "Leads move through 6 stages: New, Qualified, Proposal Sent, Negotiation, Won, and Lost. Each stage shows the number of leads and total value." },
      { heading: "Adding a Lead", text: "Click 'Add Lead' to create a new pipeline entry.",
        steps: ["Click 'Add Lead'", "Enter company name and contact person", "Set the deal value in dollars", "Choose source: Website, LinkedIn, Referral, Cold Outreach, Conference", "Assign a sales rep", "Add services (comma-separated)", "Click 'Add Lead'"] },
      { heading: "Moving Leads Through Stages", text: "Each lead card has action buttons to advance or close the deal.",
        steps: ["New leads: click 'Qualify' to move to Qualified stage", "Qualified: click 'Send Proposal'", "Proposal Sent: click 'Negotiate'", "Negotiation: click 'Won' (deal closed) or 'Lost' (deal lost)"],
        tip: "Won leads are marked green. You can switch between Kanban and List views." },
      { heading: "Editing & Deleting Leads", text: "Hover over any lead card to see edit and delete icons. Click edit to update details, or delete to remove from pipeline." },
    ]
  },
  {
    id: "invoices", title: "Invoicing", icon: FileText,
    content: [
      { heading: "Invoice Dashboard", text: "Stats at the top show: Total Collected (paid), Pending amount, Overdue amount, and total invoice count." },
      { heading: "Creating an Invoice", text: "Click 'New Invoice' to create a new invoice with line items.",
        steps: ["Click 'New Invoice'", "Select client from dropdown", "Set due date", "Add line items: description, quantity, and rate for each", "Click '+ Add item' for additional line items", "Total is calculated automatically", "Click 'Create Invoice'"],
        tip: "Invoice numbers are auto-generated (INV-2026-001, etc.). You can add unlimited line items." },
      { heading: "Marking Invoices as Paid", text: "For pending or overdue invoices, click the green checkmark icon or open the invoice and click 'Mark as Paid'. The paid date is automatically recorded." },
      { heading: "Invoice Status", text: "PAID (green) = payment received with date, PENDING (amber) = awaiting payment, OVERDUE (red) = past due date, DRAFT (gray) = not yet sent." },
      { heading: "Viewing Invoice Details", text: "Click the eye icon to open the full invoice view showing all line items with quantities, rates, and totals." },
    ]
  },
  {
    id: "calendar", title: "Calendar", icon: CalendarDays,
    content: [
      { heading: "Calendar View", text: "The calendar shows tasks and lead deadlines mapped to their due dates. Navigate between months using the arrow buttons." },
      { heading: "Color Coding", text: "Red dots = critical/urgent tasks, Amber = high priority, Blue = normal tasks, Purple = leads/deals." },
      { heading: "Upcoming Deadlines", text: "Below the calendar, you'll see a list of upcoming deadlines sorted by date." },
    ]
  },
  {
    id: "reports", title: "Reports", icon: BarChart3,
    content: [
      { heading: "Generating Reports", text: "The Reports page lets you generate PDF reports with revenue breakdown, top clients, employee performance, and task status." },
      { heading: "PDF Export", text: "Click 'Generate Report' to create a multi-page PDF with executive summary, charts, and data tables." },
    ]
  },
  {
    id: "payroll", title: "Payroll", icon: FileText,
    content: [
      { heading: "Payroll Overview", text: "The Payroll page shows salary breakdown for all employees — base salary, bonus, deductions, tax, and net pay. Stats at the top show total payroll, bonuses, tax, and payment status." },
      { heading: "Viewing Payroll", text: "Each row shows: employee name, company assignment, base salary, bonus (green), deductions (red), tax (amber), net pay (white bold), and payment status (Paid/Pending/Processing)." },
      { heading: "Filtering", text: "Search by employee name, filter by company (VCS/BSL/DPL), and select month to view payroll for different periods.",
        tip: "Export Payslips button downloads payroll data for the selected month." },
    ]
  },
  {
    id: "leaves", title: "Leave Management", icon: CalendarDays,
    content: [
      { heading: "Leave Dashboard", text: "Stats show pending requests, approved leaves, rejected, and total leave days consumed." },
      { heading: "Applying for Leave", text: "Click 'Apply Leave' to submit a leave request.",
        steps: ["Click 'Apply Leave'", "Select employee from dropdown", "Choose leave type: Annual, Sick, Casual, Maternity, or Unpaid", "Set start and end dates", "Enter reason for leave", "Click 'Submit Request'"],
        tip: "Leave requests start as 'Pending' and need manager approval." },
      { heading: "Approving / Rejecting Leaves", text: "Managers see approve (green checkmark) and reject (red X) buttons on pending leave requests. Click to change the status.",
        tip: "Approved leaves should be reflected in the Attendance system." },
    ]
  },
  {
    id: "expenses", title: "Expense Tracking", icon: FileText,
    content: [
      { heading: "Expense Dashboard", text: "Stats show total expenses, approved amount, pending amount, and total claims count." },
      { heading: "Submitting an Expense", text: "Click 'Submit Expense' to file a new expense claim.",
        steps: ["Click 'Submit Expense'", "Select employee", "Choose category: Travel, Meals, Software, Hardware, Office, Marketing, or Other", "Enter amount and description", "Set the expense date", "Click 'Submit'"],
        tip: "Each category has its own color code for easy identification." },
      { heading: "Approving Expenses", text: "Managers see approve/reject buttons on pending expenses. Approved expenses are tracked for reimbursement." },
    ]
  },
  {
    id: "email", title: "Email Integration", icon: MessageCircle,
    content: [
      { heading: "Sending Emails", text: "Click the envelope icon in the top header bar to open the email compose modal." },
      { heading: "Composing an Email", text: "The compose modal has fields for recipient (with client email autocomplete), subject, and message body.",
        steps: ["Click the envelope icon in the header", "Enter recipient email (or select from client list)", "Enter subject line", "Write your message", "Click 'Send'"],
        tip: "Emails are sent via Resend API if configured, otherwise logged in demo mode." },
    ]
  },
  {
    id: "ai-chat", title: "FU AI Assistant", icon: MessageCircle,
    content: [
      { heading: "Using FU AI", text: "Click the FU Bot mascot in the bottom-right corner to open the AI assistant. Ask questions about your CRM data in natural language." },
      { heading: "Example Queries", text: "You can ask things like:",
        steps: ["'Show me overdue invoices'", "'Which client has the highest revenue?'", "'What deals are closing this week?'", "'Give me a team performance summary'", "'Show me VCS revenue trends'"] },
      { heading: "Languages", text: "FU AI responds in whatever language you use — English, Urdu, Hinglish all work.",
        tip: "Use the quick action buttons for common queries instead of typing." },
    ]
  },
  {
    id: "shortcuts", title: "Keyboard Shortcuts", icon: Command,
    content: [
      { heading: "Command Palette", text: "Press Ctrl+K (or Cmd+K on Mac) to open the command palette. Search for anything — pages, employees, clients, tasks, leads." },
      { heading: "Navigation", text: "The command palette lets you jump to any page instantly. Type the page name and press Enter." },
      { heading: "Search", text: "Type any name, email, or title in the command palette to find matching records across all entities." },
    ]
  },
  {
    id: "settings", title: "Settings", icon: Settings,
    content: [
      { heading: "Profile", text: "Update your name, email, phone, job title, bio, timezone, and language from the Profile tab." },
      { heading: "Company", text: "View FU Corp parent company info and all subsidiary details." },
      { heading: "Notifications", text: "Toggle which notifications you receive — task assignments, deal wins, invoice payments, security alerts, weekly/monthly reports." },
      { heading: "Security", text: "Enable two-factor authentication and change your password.",
        steps: ["Go to Settings > Security", "Click 'Change Password'", "Enter your current password", "Enter and confirm your new password", "Click 'Update Password'"],
        tip: "Use a strong password with at least 8 characters including numbers and symbols." },
      { heading: "Appearance", text: "Switch between Dark Mode and Light Mode. Choose your accent color." },
    ]
  },
  {
    id: "audit", title: "Audit Log", icon: Shield,
    content: [
      { heading: "Viewing Audit Logs", text: "The Audit Log page shows a timeline of every action in the system — logins, data changes, exports, etc. Only Super Admins can access this." },
      { heading: "Filtering", text: "Filter by action type (Create, Update, Delete, Login, Export) or by entity (User, Client, Task, Invoice)." },
      { heading: "What's Logged", text: "Every create, update, delete, login, logout, and data export is recorded with: who did it, when, what changed, and their IP address." },
    ]
  },
  {
    id: "roles", title: "Roles & Permissions", icon: Key,
    content: [
      { heading: "Role Hierarchy", text: "FU Corp uses role-based access control (RBAC) with 5 levels:",
        steps: ["SUPER_ADMIN — Full access to everything (Faizan, Umer)", "PROJECT_MANAGER — Can manage employees, clients, tasks within their scope", "DEPT_HEAD — Department-level management", "TEAM_LEAD — Team-level management", "EMPLOYEE — Can view and manage their own assigned tasks/data"] },
      { heading: "What Each Role Can Do", text: "Super Admins see all data across all brands. Employees only see data assigned to them. Managers see their brand's data. The Audit Log is admin-only." },
    ]
  },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);

  const toggleExpand = (id: string) => {
    setExpandedSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const filteredSections = search
    ? sections.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.content.some((c) =>
          c.heading.toLowerCase().includes(search.toLowerCase()) ||
          c.text.toLowerCase().includes(search.toLowerCase())
        )
      )
    : sections;

  const currentSection = sections.find((s) => s.id === activeSection);

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title page
    doc.setFontSize(28);
    doc.setTextColor(255, 107, 0);
    doc.text("FU Corp CRM", pageWidth / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text("User Guide & Manual", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });
    y += 20;

    doc.setDrawColor(255, 107, 0);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    // Table of contents
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Table of Contents", 20, y);
    y += 10;
    doc.setFontSize(10);
    sections.forEach((s, i) => {
      doc.setTextColor(80, 80, 80);
      doc.text(`${i + 1}. ${s.title}`, 25, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    // Content
    for (const section of sections) {
      doc.addPage();
      y = 20;

      // Section title
      doc.setFontSize(20);
      doc.setTextColor(255, 107, 0);
      doc.text(section.title, 20, y);
      y += 4;
      doc.setDrawColor(255, 107, 0);
      doc.line(20, y, 80, y);
      y += 12;

      for (const item of section.content) {
        if (y > 250) { doc.addPage(); y = 20; }

        // Heading
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text(item.heading, 20, y);
        y += 7;

        // Text
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(item.text, pageWidth - 45);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 3;

        // Steps
        if (item.steps) {
          for (const step of item.steps) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setTextColor(60, 60, 60);
            const stepLines = doc.splitTextToSize(`  \u2022 ${step}`, pageWidth - 50);
            doc.text(stepLines, 25, y);
            y += stepLines.length * 5 + 1;
          }
          y += 3;
        }

        // Tip
        if (item.tip) {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.setFillColor(255, 247, 237);
          doc.roundedRect(20, y - 2, pageWidth - 40, 10, 2, 2, "F");
          doc.setTextColor(255, 107, 0);
          doc.setFontSize(9);
          doc.text(`Tip: ${item.tip}`, 25, y + 4);
          y += 14;
        }

        y += 5;
      }
    }

    // Footer on each page
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`FU Corp CRM User Guide | Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
    }

    doc.save("FU-Corp-CRM-User-Guide.pdf");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar TOC */}
        <div className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-8 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Book className="w-5 h-5 text-[#FF6B00]" />
              <h2 className="text-lg font-semibold text-white">User Guide</h2>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" placeholder="Search guide..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
            </div>

            {/* Export PDF */}
            <button onClick={handleExportPDF}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all">
              <Download className="w-4 h-4" /> Export as PDF
            </button>

            {/* Navigation */}
            <nav className="space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button key={section.id} onClick={() => { setActiveSection(section.id); toggleExpand(section.id); }}
                    className={clsx("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                      activeSection === section.id ? "bg-[#FF6B00]/10 text-[#FF6B00] font-medium" : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]")}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {currentSection && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                  <currentSection.icon className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">{currentSection.title}</h1>
              </div>

              {currentSection.content.map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="text-base font-semibold text-white mb-3">{item.heading}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{item.text}</p>

                  {item.steps && (
                    <ol className="mt-4 space-y-2">
                      {item.steps.map((step, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                          <span className="text-white/70">{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {item.tip && (
                    <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10">
                      <HelpCircle className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#FF6B00]/80">{item.tip}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Print button at bottom */}
          <div className="mt-10 flex gap-3">
            <button onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:text-white">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
