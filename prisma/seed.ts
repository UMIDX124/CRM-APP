import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FU Corp CRM database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.task.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.company.deleteMany();

  // Create mother company
  const fu = await prisma.company.create({
    data: {
      name: "FU Corp",
      code: "FU",
      legalName: "FU Corporation LLC",
      description: "Mother company. Operates VCS, BSL, and DPL as wholly-owned subsidiaries.",
      website: "fucorp.com",
      industry: "Technology / Marketing Services",
      timezone: "Asia/Karachi",
      currency: "USD",
      locale: "en",
      isActive: true,
    },
  });

  // Create brands (subsidiaries) under FU Corp
  const vcs = await prisma.brand.create({ data: { name: "Virtual Customer Solution", code: "VCS", color: "#D4AF37", website: "virtualcustomersolution.com", companyId: fu.id } });
  const bsl = await prisma.brand.create({ data: { name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6", website: "backup-solutions.vercel.app", companyId: fu.id } });
  const dpl = await prisma.brand.create({ data: { name: "Digital Point LLC", code: "DPL", color: "#22C55E", website: "digitalpointllc.com", companyId: fu.id } });

  console.log("Brands created: VCS, BSL, DPL");

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  // Create users
  const faizan = await prisma.user.create({ data: { firstName: "Faizan", lastName: "", email: "faizi@digitalpointllc.com", passwordHash: hash("faizi13579"), phone: "+92 300-1234567", title: "Co-Founder & CEO", role: "SUPER_ADMIN", department: "LEADERSHIP", brandId: dpl.id, status: "ACTIVE", hireDate: new Date("2023-01-15"), salary: 15000, skills: ["Media Buying", "Meta", "Google", "YouTube", "Strategy"] } });
  const umer = await prisma.user.create({ data: { firstName: "Umer", lastName: "", email: "umi@digitalpointllc.com", passwordHash: hash("umi84268"), phone: "+92 300-7654321", title: "Co-Founder & CTO", role: "SUPER_ADMIN", department: "LEADERSHIP", brandId: dpl.id, status: "ACTIVE", hireDate: new Date("2023-01-15"), salary: 15000, skills: ["Performance Marketing", "Analytics", "Scaling", "Tech"] } });
  const ali = await prisma.user.create({ data: { firstName: "Ali", lastName: "Hassan", email: "ali@digitalpointllc.com", passwordHash: hash("specialist123"), phone: "+92 333-5559876", title: "Full Stack Developer", role: "PROJECT_MANAGER", department: "DEV", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2023-04-20"), salary: 5500, skills: ["React", "Node.js", "PostgreSQL", "AWS", "Next.js"], managerId: umer.id } });
  const ahmed = await prisma.user.create({ data: { firstName: "Ahmed", lastName: "Khan", email: "ahmed.khan@vcs.pk", passwordHash: hash("welcome123"), phone: "+92 321-5551234", title: "Senior SEO Manager", role: "TEAM_LEAD", department: "MARKETING", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2023-06-10"), salary: 4500, skills: ["SEO", "Google Analytics", "Content Strategy"], managerId: ali.id } });
  const fatima = await prisma.user.create({ data: { firstName: "Fatima", lastName: "Hassan", email: "fatima.h@vcs.pk", passwordHash: hash("welcome123"), phone: "+92 345-5553333", title: "PPC Specialist", role: "EMPLOYEE", department: "MARKETING", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2024-01-08"), salary: 3000, skills: ["Google Ads", "Facebook Ads", "Analytics"] } });
  const usman = await prisma.user.create({ data: { firstName: "Usman", lastName: "Tariq", email: "usman.t@vcs.pk", passwordHash: hash("welcome123"), phone: "+92 300-5554444", title: "Social Media Manager", role: "EMPLOYEE", department: "MARKETING", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2024-03-15"), salary: 2500, skills: ["Instagram", "LinkedIn", "Content Creation", "TikTok"] } });
  const hamza = await prisma.user.create({ data: { firstName: "Hamza", lastName: "Ali", email: "hamza@backupsolutions.pk", passwordHash: hash("welcome123"), phone: "+92 311-5552222", title: "DevOps Engineer", role: "TEAM_LEAD", department: "DEV", brandId: bsl.id, status: "ACTIVE", hireDate: new Date("2023-08-01"), salary: 5000, skills: ["AWS", "Docker", "CI/CD", "Kubernetes"] } });
  const sarah = await prisma.user.create({ data: { firstName: "Sarah", lastName: "Williams", email: "sarah@backupsolutions.pk", passwordHash: hash("welcome123"), phone: "+1 555-5551111", title: "AI Engineer", role: "EMPLOYEE", department: "DEV", brandId: bsl.id, status: "ACTIVE", hireDate: new Date("2024-02-01"), salary: 6000, skills: ["ML Models", "Python", "TensorFlow", "LLMs"] } });
  const bilal = await prisma.user.create({ data: { firstName: "Bilal", lastName: "Rashid", email: "bilal@vcs.pk", passwordHash: hash("welcome123"), phone: "+92 322-5556666", title: "Video Editor", role: "EMPLOYEE", department: "CREATIVE", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2024-06-01"), salary: 2000, skills: ["Premiere Pro", "After Effects", "Motion Graphics"] } });
  const zainab = await prisma.user.create({ data: { firstName: "Zainab", lastName: "Malik", email: "zainab@digitalpointllc.com", passwordHash: hash("welcome123"), title: "Graphic Designer", role: "EMPLOYEE", department: "CREATIVE", brandId: dpl.id, status: "ACTIVE", hireDate: new Date("2024-04-10"), salary: 2200, skills: ["Figma", "Photoshop", "UI/UX"] } });
  const owais = await prisma.user.create({ data: { firstName: "Owais", lastName: "Ahmed", email: "owais@backupsolutions.pk", passwordHash: hash("welcome123"), title: "Support Lead", role: "TEAM_LEAD", department: "SUPPORT", brandId: bsl.id, status: "ACTIVE", hireDate: new Date("2023-11-20"), salary: 3500, skills: ["Customer Support", "Zendesk", "Documentation"] } });
  const nadia = await prisma.user.create({ data: { firstName: "Nadia", lastName: "Khan", email: "nadia@vcs.pk", passwordHash: hash("welcome123"), title: "HR Manager", role: "DEPT_HEAD", department: "ADMIN", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2023-09-01"), salary: 4000, skills: ["Recruitment", "HR Policy", "Payroll"] } });
  // Demo viewer
  await prisma.user.create({ data: { firstName: "Client", lastName: "Demo", email: "client@example.com", passwordHash: hash("viewer123"), title: "Demo Viewer", role: "EMPLOYEE", department: "ADMIN", brandId: vcs.id, status: "ACTIVE", hireDate: new Date("2024-01-01"), salary: 0 } });

  console.log("Users created: 13 employees");

  // Create clients
  const c1 = await prisma.client.create({ data: { companyName: "Sarah Mitchell E-Commerce", contactName: "Sarah Mitchell", email: "sarah@ecommerce-brand.com", phone: "+1 415-555-0123", country: "United States", countryFlag: "US", source: "Referral", status: "ACTIVE", healthScore: 92, mrr: 8500, brandId: vcs.id } });
  const c2 = await prisma.client.create({ data: { companyName: "SaaS Startup Client", contactName: "Tech Founder", email: "founder@saas-startup.io", phone: "+1 650-555-0124", country: "United States", countryFlag: "US", source: "Website", status: "ACTIVE", healthScore: 88, mrr: 12000, brandId: vcs.id } });
  const c3 = await prisma.client.create({ data: { companyName: "Marketing Agency Partner", contactName: "Agency Owner", email: "owner@marketing-agency.co", phone: "+44 20-555-0125", country: "United Kingdom", countryFlag: "UK", source: "LinkedIn", status: "ACTIVE", healthScore: 95, mrr: 5800, brandId: vcs.id } });
  const c4 = await prisma.client.create({ data: { companyName: "TechMart", contactName: "Sarah Chen", email: "sarah.chen@techmart.com", phone: "+1 555-0126", country: "United States", countryFlag: "US", source: "Website", status: "ACTIVE", healthScore: 94, mrr: 15000, brandId: bsl.id } });
  const c5 = await prisma.client.create({ data: { companyName: "SecureBank", contactName: "CISO", email: "security@securebank.com", phone: "+1 212-555-0127", country: "United States", countryFlag: "US", source: "Referral", status: "ACTIVE", healthScore: 98, mrr: 25000, brandId: bsl.id } });
  const c6 = await prisma.client.create({ data: { companyName: "DataFlow Analytics", contactName: "CEO", email: "ceo@dataflow.ai", phone: "+1 408-555-0128", country: "United States", countryFlag: "US", source: "Cold Outreach", status: "ACTIVE", healthScore: 91, mrr: 18000, brandId: bsl.id } });
  const c7 = await prisma.client.create({ data: { companyName: "DTC E-Commerce Brand", contactName: "Marcus Thompson", email: "marcus@ecommerce-dtc.com", phone: "+1 310-555-0129", country: "United States", countryFlag: "US", source: "Referral", status: "ACTIVE", healthScore: 96, mrr: 22000, brandId: dpl.id } });
  const c8 = await prisma.client.create({ data: { companyName: "B2B SaaS Company", contactName: "Sarah Chen", email: "sarah.chen@b2b-saas.io", phone: "+1 415-555-0130", country: "United States", countryFlag: "US", source: "Website", status: "ACTIVE", healthScore: 93, mrr: 28000, brandId: dpl.id } });

  console.log("Clients created: 8");

  // Create tasks
  await prisma.task.createMany({ data: [
    { title: "Monthly SEO Audit Report", description: "Complete SEO audit for Sarah Mitchell E-Commerce", status: "IN_PROGRESS", priority: "HIGH", department: "MARKETING", assigneeId: ahmed.id, creatorId: ali.id, clientId: c1.id, brandId: vcs.id, dueDate: new Date("2026-04-05"), timeSpent: 6 },
    { title: "Meta Ads Campaign Optimization", description: "Optimize lookalike audiences for DTC E-Commerce", status: "IN_PROGRESS", priority: "URGENT", department: "MARKETING", assigneeId: faizan.id, creatorId: umer.id, clientId: c7.id, brandId: dpl.id, dueDate: new Date("2026-04-02"), timeSpent: 8 },
    { title: "E-Commerce Platform Migration", description: "Migrate TechMart to new cloud infrastructure", status: "IN_PROGRESS", priority: "HIGH", department: "DEV", assigneeId: ali.id, creatorId: hamza.id, clientId: c4.id, brandId: bsl.id, dueDate: new Date("2026-04-08"), timeSpent: 12 },
    { title: "Banking Security Audit", description: "Complete security audit for SecureBank", status: "TODO", priority: "URGENT", department: "DEV", assigneeId: hamza.id, creatorId: umer.id, clientId: c5.id, brandId: bsl.id, dueDate: new Date("2026-04-04") },
    { title: "AI Analytics Dashboard", description: "Build prediction engine for DataFlow", status: "IN_PROGRESS", priority: "HIGH", department: "DEV", assigneeId: sarah.id, creatorId: hamza.id, clientId: c6.id, brandId: bsl.id, dueDate: new Date("2026-04-10"), timeSpent: 15 },
    { title: "Google Ads ROAS Optimization", description: "Improve ROAS for B2B SaaS client", status: "REVIEW", priority: "MEDIUM", department: "MARKETING", assigneeId: umer.id, creatorId: faizan.id, clientId: c8.id, brandId: dpl.id, dueDate: new Date("2026-04-03"), timeSpent: 10 },
    { title: "Content Calendar Q2", description: "Plan Q2 content strategy", status: "TODO", priority: "MEDIUM", department: "MARKETING", assigneeId: usman.id, creatorId: ahmed.id, clientId: c3.id, brandId: vcs.id, dueDate: new Date("2026-04-06") },
    { title: "PPC Campaign Setup", description: "Set up new PPC campaigns for SaaS Startup", status: "TODO", priority: "HIGH", department: "MARKETING", assigneeId: fatima.id, creatorId: ali.id, clientId: c2.id, brandId: vcs.id, dueDate: new Date("2026-04-07") },
  ]});
  console.log("Tasks created: 8");

  // Create leads
  await prisma.lead.createMany({ data: [
    { companyName: "Singapore FinTech", contactName: "David Tan", email: "david@sgfintech.sg", country: "Singapore", countryFlag: "SG", services: ["Web Development", "AI Modeling"], source: "Website", status: "PROPOSAL_SENT", value: 8500, probability: 60, brandId: bsl.id },
    { companyName: "London Legal Services", contactName: "James Wilson", email: "james@llsolicitors.co.uk", country: "United Kingdom", countryFlag: "UK", services: ["Remote Workforce"], source: "LinkedIn", status: "NEGOTIATION", value: 4200, probability: 75, brandId: vcs.id },
    { companyName: "Lead Gen Agency", contactName: "Jennifer Walsh", email: "jennifer@leadgenagency.com", country: "United States", countryFlag: "US", services: ["Performance Marketing", "Attribution"], source: "Referral", status: "QUALIFIED", value: 15000, probability: 40, brandId: dpl.id },
    { companyName: "Tokyo Tech Ventures", contactName: "Yuki Tanaka", email: "yuki@tokyotech.jp", country: "Japan", services: ["Cloud Solutions", "AI"], source: "Website", status: "NEW", value: 12000, probability: 20, brandId: bsl.id },
    { companyName: "Cape Town Logistics", contactName: "Thabo Molefe", email: "thabo@ctl.co.za", country: "South Africa", services: ["Web Architecture"], source: "Website", status: "WON", value: 5600, probability: 100, brandId: vcs.id },
    { companyName: "Toronto E-Commerce", contactName: "Mike Johnson", email: "mike@toronto-ecom.ca", country: "Canada", services: ["Performance Marketing"], source: "Cold Outreach", status: "LOST", value: 8000, probability: 0, brandId: dpl.id },
  ]});
  console.log("Leads created: 6");

  // Create invoices
  await prisma.invoice.createMany({ data: [
    { number: "INV-2026-001", clientId: c5.id, brandId: bsl.id, items: [{ description: "Cybersecurity Audit Q1", quantity: 1, rate: 25000 }], subtotal: 25000, tax: 0, total: 25000, status: "PAID", issueDate: new Date("2026-03-01"), dueDate: new Date("2026-03-15"), paidDate: new Date("2026-03-12") },
    { number: "INV-2026-002", clientId: c7.id, brandId: dpl.id, items: [{ description: "Meta Ads Management", quantity: 1, rate: 22000 }, { description: "Google Ads Setup", quantity: 1, rate: 5000 }], subtotal: 27000, tax: 0, total: 27000, status: "PAID", issueDate: new Date("2026-03-01"), dueDate: new Date("2026-03-15"), paidDate: new Date("2026-03-14") },
    { number: "INV-2026-003", clientId: c4.id, brandId: bsl.id, items: [{ description: "E-Commerce Platform Maintenance", quantity: 1, rate: 15000 }], subtotal: 15000, tax: 0, total: 15000, status: "PENDING", issueDate: new Date("2026-03-15"), dueDate: new Date("2026-04-05") },
    { number: "INV-2026-004", clientId: c8.id, brandId: dpl.id, items: [{ description: "Attribution Setup", quantity: 1, rate: 18000 }, { description: "CRM Integration", quantity: 1, rate: 10000 }], subtotal: 28000, tax: 0, total: 28000, status: "PENDING", issueDate: new Date("2026-03-20"), dueDate: new Date("2026-04-10") },
    { number: "INV-2026-005", clientId: c1.id, brandId: vcs.id, items: [{ description: "AI CX Platform - March", quantity: 1, rate: 8500 }], subtotal: 8500, tax: 0, total: 8500, status: "OVERDUE", issueDate: new Date("2026-02-28"), dueDate: new Date("2026-03-15") },
    { number: "INV-2026-006", clientId: c6.id, brandId: bsl.id, items: [{ description: "AI Dashboard Development", quantity: 1, rate: 18000 }], subtotal: 18000, tax: 0, total: 18000, status: "PAID", issueDate: new Date("2026-03-10"), dueDate: new Date("2026-03-25"), paidDate: new Date("2026-03-22") },
  ]});
  console.log("Invoices created: 6");

  // Create attendance for last 5 days
  const users = [faizan, umer, ali, ahmed, fatima, usman, hamza, sarah, bilal, zainab, owais, nadia];
  const statuses: ("PRESENT" | "REMOTE" | "LATE" | "LEAVE" | "ABSENT")[] = ["PRESENT", "PRESENT", "PRESENT", "REMOTE", "PRESENT", "PRESENT", "LATE", "PRESENT", "PRESENT", "LEAVE", "PRESENT", "ABSENT"];

  for (let d = 0; d < 5; d++) {
    const date = new Date("2026-04-02");
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let i = 0; i < users.length; i++) {
      const s = statuses[(i + d) % statuses.length];
      const checkIn = s === "LEAVE" || s === "ABSENT" ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate(), s === "LATE" ? 10 : 9, Math.floor(Math.random() * 15));
      const checkOut = !checkIn || d === 0 ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, Math.floor(Math.random() * 30));
      const hours = checkIn && checkOut ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 10) / 10 : 0;

      await prisma.attendance.create({
        data: { userId: users[i].id, date, status: s, checkIn, checkOut, hoursWorked: hours },
      });
    }
  }
  console.log("Attendance records created");

  console.log("\nSeed complete! Login credentials:");
  console.log("  Faizan (SUPER_ADMIN): faizi@digitalpointllc.com / faizi13579");
  console.log("  Umer (SUPER_ADMIN): umi@digitalpointllc.com / umi84268");
  console.log("  Ali Hassan (PM): ali@digitalpointllc.com / specialist123");
  console.log("  Demo Viewer: client@example.com / viewer123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
