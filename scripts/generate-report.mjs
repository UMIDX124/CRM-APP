import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF();
const W = doc.internal.pageSize.getWidth();
const orange = [255, 107, 0];
const black = [9, 9, 11];
const gray = [100, 100, 100];
const white = [250, 250, 250];
let y = 0;

function newPage() { doc.addPage(); y = 25; }
function heading(text, size = 18) {
  if (y > 260) newPage();
  doc.setFontSize(size); doc.setTextColor(...orange);
  doc.text(text, 20, y); y += size * 0.5 + 2;
  doc.setDrawColor(...orange); doc.line(20, y, 80, y); y += 8;
}
function subheading(text) {
  if (y > 265) newPage();
  doc.setFontSize(12); doc.setTextColor(30, 30, 30);
  doc.text(text, 20, y); y += 7;
}
function body(text) {
  if (y > 270) newPage();
  doc.setFontSize(9.5); doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, W - 45);
  doc.text(lines, 20, y); y += lines.length * 4.5 + 3;
}
function bullet(text) {
  if (y > 270) newPage();
  doc.setFontSize(9.5); doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, W - 50);
  doc.text("•", 22, y);
  doc.text(lines, 28, y); y += lines.length * 4.5 + 1;
}
function tableRow(cols, widths, bold = false) {
  if (y > 272) newPage();
  doc.setFontSize(8.5);
  let x = 20;
  cols.forEach((col, i) => {
    if (bold) { doc.setTextColor(30, 30, 30); doc.setFont(undefined, "bold"); }
    else { doc.setTextColor(60, 60, 60); doc.setFont(undefined, "normal"); }
    doc.text(String(col), x, y);
    x += widths[i];
  });
  y += 5;
}
function spacer(h = 5) { y += h; }

// ═══ TITLE PAGE ═══
doc.setFillColor(...black);
doc.rect(0, 0, W, 297, "F");

doc.setFontSize(42); doc.setTextColor(...orange);
doc.text("FU CORP", W / 2, 80, { align: "center" });
doc.setFontSize(16); doc.setTextColor(...white);
doc.text("Command Center — CRM", W / 2, 95, { align: "center" });

doc.setDrawColor(...orange); doc.setLineWidth(0.5);
doc.line(60, 105, W - 60, 105);

doc.setFontSize(11); doc.setTextColor(150, 150, 150);
doc.text("Complete Development Report", W / 2, 120, { align: "center" });
doc.text("All Features, Modules & Technical Documentation", W / 2, 128, { align: "center" });

doc.setFontSize(10); doc.setTextColor(120, 120, 120);
doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, W / 2, 160, { align: "center" });
doc.text("https://fu-corp-crm.vercel.app", W / 2, 168, { align: "center" });
doc.text("https://github.com/UMIDX124/CRM-APP", W / 2, 176, { align: "center" });

doc.setFontSize(9); doc.setTextColor(80, 80, 80);
doc.text("Next.js 16 • React 19 • Prisma 7 • Neon Postgres • Groq AI • Vercel", W / 2, 200, { align: "center" });

doc.setFontSize(8); doc.setTextColor(60, 60, 60);
doc.text("FU Corp — Faizan & Umer", W / 2, 270, { align: "center" });
doc.text("VCS • BSL • DPL", W / 2, 277, { align: "center" });

// ═══ TABLE OF CONTENTS ═══
newPage();
heading("Table of Contents", 20);
spacer(5);
const toc = [
  "1. Project Overview",
  "2. Company Structure",
  "3. All 19 Pages — Complete Feature List",
  "4. API Routes (17 Endpoints)",
  "5. Database Schema (13 Tables)",
  "6. Global Features",
  "7. Design & Theme",
  "8. Authentication & Security",
  "9. Seeded Data",
  "10. Login Credentials",
  "11. Tech Stack",
];
toc.forEach(t => { doc.setFontSize(11); doc.setTextColor(40, 40, 40); doc.text(t, 25, y); y += 8; });

// ═══ 1. PROJECT OVERVIEW ═══
newPage();
heading("1. Project Overview");
const overview = [
  ["Project", "FU Corp Command Center — Enterprise CRM"],
  ["Live URL", "https://fu-corp-crm.vercel.app"],
  ["GitHub", "https://github.com/UMIDX124/CRM-APP"],
  ["Framework", "Next.js 16.2.1 + React 19.2.4"],
  ["Styling", "Tailwind CSS 4 + shadcn/ui"],
  ["Database", "Prisma 7 + Neon Postgres (serverless)"],
  ["AI", "Groq (Llama 3.3 70B Versatile)"],
  ["Hosting", "Vercel (umidx124s-projects)"],
  ["Total Pages", "19"],
  ["Total API Routes", "17"],
  ["Database Tables", "13"],
  ["Total Commits", "25+"],
];
overview.forEach(([k, v]) => {
  doc.setFontSize(9.5); doc.setTextColor(...orange); doc.text(k + ":", 20, y);
  doc.setTextColor(60, 60, 60); doc.text(v, 65, y); y += 6;
});

// ═══ 2. COMPANY STRUCTURE ═══
spacer(10);
heading("2. Company Structure");
body("FU Corp is the mother company. All employees are hired centrally by FU Corp and assigned to subsidiary companies.");
spacer(3);
bullet("FU Corp — Parent Company (Faizan & Umer, Co-Founders)");
bullet("VCS — Virtual Customer Solution (Orange theme) — Digital marketing, virtual services");
bullet("BSL — Backup Solutions LLC (Blue theme) — Cloud backup, cybersecurity, tech services");
bullet("DPL — Digital Point LLC (Green theme) — Performance marketing, $50M+ ad spend managed");

// ═══ 3. ALL 19 PAGES ═══
newPage();
heading("3. All 19 Pages — Feature List", 18);

const pages = [
  { name: "Dashboard (/)", desc: "KPI cards (revenue, clients, team, tasks), revenue chart with 3 brand lines, activity feed, top clients, task status pie chart, time range filter (7d/30d/90d)" },
  { name: "Clients (/clients)", desc: "Add/Edit/Delete clients, view detail modal with all info, search/filter by brand, MRR tracking, health score progress bars (green/amber/red), services management, toast notifications" },
  { name: "Pipeline (/pipeline)", desc: "Kanban: New→Qualified→Proposal→Negotiation→Won/Lost. Stage transition buttons on each card. List view. Deal value per stage. Win rate %. Add/edit leads with sales rep assignment" },
  { name: "Tasks (/tasks)", desc: "Kanban: TODO→In Progress→Review→Done. Move buttons (Start/Review/Done/Back/Approve). Overdue detection with red highlight. Priority colors. Assignee + client + due date" },
  { name: "Team (/employees)", desc: "Grid + List view. Hire employee with password + PIN setup. Edit/Remove with confirmation. Filter by company/department/status. Performance score bars" },
  { name: "Attendance (/attendance)", desc: "3 views: Daily table, Monthly heatmap grid (colored dots), Date Range aggregate report. Stats per company. CSV export. Brand filter" },
  { name: "Check-In (/attendance/checkin)", desc: "3 methods: Self check-in button with live clock, Admin panel (mark anyone), PIN kiosk tab. Recent activity feed" },
  { name: "PIN Kiosk (/kiosk)", desc: "Standalone full-screen page for office tablet. Numpad PIN entry. Success/error screens. Live clock. No sidebar needed" },
  { name: "Leaves (/leaves)", desc: "Apply for leave (5 types: Annual/Sick/Casual/Maternity/Unpaid). Approve/Reject workflow. Stats cards. Filter by status" },
  { name: "Payroll (/payroll)", desc: "Salary breakdown: base, bonus, deductions, tax, net pay. Status tracking (Paid/Pending/Processing). Month filter. Company filter" },
  { name: "Expenses (/expenses)", desc: "Submit expenses (7 categories). Approve/Reject. Stats dashboard. Color-coded categories" },
  { name: "Invoices (/invoices)", desc: "Create with multiple line items (desc + qty + rate). Auto-numbering. Mark as Paid. View detail modal. Stats (collected/pending/overdue)" },
  { name: "Calendar (/calendar)", desc: "Monthly calendar with tasks + leads mapped to dates. Color-coded events. Upcoming deadlines list" },
  { name: "Reports (/reports)", desc: "PDF generation with multi-page output: executive summary, revenue by brand, top clients, employee rankings, task distribution" },
  { name: "Audit Log (/audit)", desc: "Timeline of all system actions (Login/Create/Update/Delete/Export). Filter by action/entity. User + timestamp + IP + changes" },
  { name: "User Guide (/guide)", desc: "18 sections with search, step-by-step instructions, tips. Export as PDF. Print button" },
  { name: "Shortcuts (/shortcuts)", desc: "Visual keyboard shortcut reference" },
  { name: "Settings (/settings)", desc: "Profile, Company info, Notification toggles (8), Security (change password, 2FA, sessions), Appearance (dark/light, accent)" },
  { name: "Login (/login)", desc: "Real auth via API (bcrypt). Quick access buttons. Register form. Falls back to demo if DB offline" },
];

pages.forEach((p, i) => {
  if (y > 255) newPage();
  doc.setFontSize(10); doc.setTextColor(...orange);
  doc.text(`${i + 1}. ${p.name}`, 20, y); y += 5;
  doc.setFontSize(8.5); doc.setTextColor(70, 70, 70);
  const lines = doc.splitTextToSize(p.desc, W - 45);
  doc.text(lines, 25, y); y += lines.length * 4 + 5;
});

// ═══ 4. API ROUTES ═══
newPage();
heading("4. API Routes (17 Endpoints)");
const apis = [
  ["POST /api/auth/login", "Login with bcrypt password verification"],
  ["POST /api/auth/logout", "Destroy session + audit log"],
  ["GET /api/auth/me", "Get current user from session cookie"],
  ["POST /api/auth/change-password", "Verify current, hash new, audit log"],
  ["GET|POST /api/employees", "List (filter/search) + Create with hashed password"],
  ["GET|POST /api/clients", "List (filter by brand/status) + Create with audit"],
  ["GET|POST /api/tasks", "List (filter by status/priority) + Create"],
  ["GET|POST /api/leads", "List + Create with audit logging"],
  ["GET|POST /api/invoices", "List + Create with auto-numbering"],
  ["GET|POST /api/attendance", "List by date + Upsert check-in/out"],
  ["GET|PATCH /api/notifications", "List + Mark as read"],
  ["GET /api/audit", "List audit logs (admin only)"],
  ["GET /api/export", "CSV export for any entity"],
  ["POST /api/email", "Send via Resend (or mock)"],
  ["POST /api/upload", "File upload via Vercel Blob"],
  ["POST /api/chat", "Groq AI streaming with CRM data context"],
];
apis.forEach(([endpoint, desc]) => {
  if (y > 272) newPage();
  doc.setFontSize(8.5); doc.setTextColor(...orange); doc.text(endpoint, 20, y);
  doc.setTextColor(70, 70, 70); doc.text(desc, 95, y); y += 5.5;
});

// ═══ 5. DATABASE SCHEMA ═══
newPage();
heading("5. Database Schema (13 Tables)");
const tables = [
  ["brands", "VCS, BSL, DPL subsidiaries", "name, code, color, parentId"],
  ["users", "All employees (13 seeded)", "email, passwordHash, role, dept, salary, skills[]"],
  ["clients", "Customer companies (8)", "companyName, mrr, healthScore, brandId"],
  ["tasks", "Task tracking (8)", "title, status, priority, assigneeId, dueDate"],
  ["leads", "Sales pipeline (6)", "companyName, status, value, probability"],
  ["invoices", "Billing (6)", "number, items (JSON), total, status, dates"],
  ["attendance", "Daily check-in/out", "userId, date, checkIn, checkOut, hours"],
  ["comments", "Task comments", "content, taskId, authorId"],
  ["notes", "Client notes", "content, clientId, isPrivate"],
  ["attachments", "File uploads", "filename, url, mimeType, size"],
  ["notifications", "User alerts", "title, message, type, isRead"],
  ["audit_logs", "Action tracking", "action, entity, changes (JSON), ipAddress"],
  ["sessions", "Auth sessions", "sessionToken, userId, expires"],
];
tables.forEach(([name, purpose, fields]) => {
  if (y > 268) newPage();
  doc.setFontSize(9); doc.setTextColor(...orange); doc.text(name, 20, y);
  doc.setTextColor(40, 40, 40); doc.text(purpose, 55, y);
  y += 4.5;
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text(fields, 25, y); y += 6;
});

spacer(5);
body("9 Enums: Role, Department, EmployeeStatus, TaskStatus, Priority, ClientStatus, InvoiceStatus, LeadStatus, AttendanceStatus");

// ═══ 6. GLOBAL FEATURES ═══
newPage();
heading("6. Global Features");
const features = [
  ["Ctrl+K Command Palette", "Search employees, clients, tasks, leads. Navigate to any page instantly"],
  ["FU AI Assistant (Groq)", "Chat with CRM data. Animated robot fox mascot with 5 emotions"],
  ["Notification Center", "Bell dropdown with 8 types. Mark read/unread"],
  ["Email Compose", "Envelope icon → modal with client autocomplete. Sends via Resend"],
  ["Toast Notifications", "Success/error/warning/info popups on every action"],
  ["Breadcrumbs", "Auto-generated path navigation on every page"],
  ["Mobile Bottom Nav", "Tab bar (Home/Clients/Tasks/Team) on mobile"],
  ["Dark/Light Mode", "Toggle in sidebar. Neon orange on dark, proper light overrides"],
  ["PWA Manifest", "Installable on mobile phones as app"],
  ["i18n Ready", "English + Urdu translations (60+ keys)"],
  ["CSV Export", "Download any table as CSV"],
  ["Loading Skeletons", "Shimmer effect while data loads"],
  ["Empty States", "Illustrations + CTA when no data"],
];
features.forEach(([name, desc]) => {
  if (y > 268) newPage();
  doc.setFontSize(9.5); doc.setTextColor(...orange); doc.text(name, 20, y);
  y += 4.5;
  doc.setFontSize(8.5); doc.setTextColor(70, 70, 70);
  const lines = doc.splitTextToSize(desc, W - 45);
  doc.text(lines, 25, y); y += lines.length * 4 + 4;
});

// ═══ 7. DESIGN ═══
newPage();
heading("7. Design & Theme");
const design = [
  ["Primary Color", "Neon Orange #FF6B00"],
  ["Background", "Deep Black #09090B with carbon fiber texture"],
  ["Font", "Inter (system-ui fallback)"],
  ["Logo", "Custom SVG shield with compass, circuits, crown, neon glow"],
  ["Mascot", "Robot fox — blinks, bobs, thinks, sparkles"],
  ["UI Library", "shadcn/ui components + custom"],
  ["Animations", "fadeInUp, scaleIn, shimmer, hover-lift, neon-pulse"],
];
design.forEach(([k, v]) => {
  doc.setFontSize(9.5); doc.setTextColor(...orange); doc.text(k + ":", 20, y);
  doc.setTextColor(60, 60, 60); doc.text(v, 65, y); y += 6.5;
});

// ═══ 8. AUTH ═══
spacer(10);
heading("8. Authentication & Security");
bullet("Session-based auth with httpOnly cookies (7-day expiry)");
bullet("bcrypt password hashing (12 rounds)");
bullet("Role-Based Access Control — 5 levels (SUPER_ADMIN to EMPLOYEE)");
bullet("Change password form (current → new → confirm)");
bullet("Audit logging on every action (create/update/delete/login/logout/export)");
bullet("2FA field in database schema (ready for implementation)");
bullet("Active session tracking with IP and user agent");

// ═══ 9. SEEDED DATA ═══
newPage();
heading("9. Seeded Data");
const seeds = [
  ["Brands", "3", "VCS, BSL, DPL"],
  ["Employees", "13", "Faizan, Umer, Ali, Ahmed, Fatima, Usman, Hamza, Sarah, Bilal, Zainab, Owais, Nadia, Demo"],
  ["Clients", "8", "Sarah Mitchell, SaaS Startup, Marketing Agency, TechMart, SecureBank, DataFlow, DTC E-Commerce, B2B SaaS"],
  ["Tasks", "8", "SEO Audit, Meta Ads, Platform Migration, Security Audit, AI Dashboard, ROAS, Content Calendar, PPC Setup"],
  ["Leads", "6", "Singapore FinTech, London Legal, Lead Gen Agency, Tokyo Tech, Cape Town Logistics, Toronto E-Commerce"],
  ["Invoices", "6", "$8.5K - $28K range — Paid, Pending, Overdue"],
];
seeds.forEach(([entity, count, details]) => {
  doc.setFontSize(10); doc.setTextColor(...orange); doc.text(`${entity} (${count})`, 20, y); y += 5;
  doc.setFontSize(8.5); doc.setTextColor(70, 70, 70);
  const lines = doc.splitTextToSize(details, W - 45);
  doc.text(lines, 25, y); y += lines.length * 4 + 5;
});

// ═══ 10. CREDENTIALS ═══
spacer(5);
heading("10. Login Credentials");
const creds = [
  ["Faizan", "faizi@digitalpointllc.com", "faizi13579", "SUPER_ADMIN"],
  ["Umer", "umi@digitalpointllc.com", "umi84268", "SUPER_ADMIN"],
  ["Ali Hassan", "ali@digitalpointllc.com", "specialist123", "PROJECT_MANAGER"],
  ["All Others", "(their email)", "welcome123", "Various"],
  ["Demo", "client@example.com", "viewer123", "EMPLOYEE"],
];
tableRow(["Name", "Email", "Password", "Role"], [30, 55, 35, 35], true);
doc.setDrawColor(200, 200, 200); doc.line(20, y - 2, W - 20, y - 2); y += 2;
creds.forEach(c => tableRow(c, [30, 55, 35, 35]));

// ═══ 11. TECH STACK ═══
spacer(10);
heading("11. Tech Stack");
bullet("Next.js 16.2.1 — App Router, Server Components");
bullet("React 19.2.4 — Latest with concurrent features");
bullet("Tailwind CSS 4 — Utility-first styling");
bullet("shadcn/ui — Radix UI primitives with custom theme");
bullet("Prisma 7 — ORM with @prisma/adapter-neon (serverless HTTP)");
bullet("Neon Postgres — Serverless database with branching");
bullet("Groq — Llama 3.3 70B via @ai-sdk/groq");
bullet("Vercel AI SDK 6 — Streaming chat with useChat hook");
bullet("jsPDF — PDF generation for reports and user guide");
bullet("Recharts — Revenue and analytics charts");
bullet("Lucide React — Icon library");
bullet("bcryptjs — Password hashing");

// ═══ FOOTER ON ALL PAGES ═══
const pageCount = (doc.internal).getNumberOfPages();
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);
  doc.setFontSize(7); doc.setTextColor(160, 160, 160);
  if (i > 1) {
    doc.text(`FU Corp CRM — Development Report | Page ${i} of ${pageCount}`, W / 2, 290, { align: "center" });
  }
}

// Save
const output = doc.output("arraybuffer");
const outPath = "D:/claude-Ai-Bot-main/claude-Ai-Bot-main/public/FU-Corp-CRM-Report.pdf";
fs.writeFileSync(outPath, Buffer.from(output));
console.log(`PDF saved to: ${outPath}`);
console.log(`Pages: ${pageCount}`);
console.log(`Download: https://fu-corp-crm.vercel.app/FU-Corp-CRM-Report.pdf`);
