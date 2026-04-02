import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Itl83ZmrEBAV@ep-bold-pine-anv7sh85-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function createSchema() {
  console.log("Creating enums...");
  const enums = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','PROJECT_MANAGER','DEPT_HEAD','TEAM_LEAD','EMPLOYEE'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Department') THEN CREATE TYPE "Department" AS ENUM ('LEADERSHIP','MARKETING','DEV','CREATIVE','SUPPORT','ADMIN','SALES','OPS'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeStatus') THEN CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE','ON_LEAVE','TERMINATED','PROBATION'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN CREATE TYPE "TaskStatus" AS ENUM ('TODO','IN_PROGRESS','REVIEW','COMPLETED','BLOCKED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Priority') THEN CREATE TYPE "Priority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientStatus') THEN CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE','PAUSED','COMPLETED','CANCELLED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','PENDING','PAID','OVERDUE','CANCELLED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus') THEN CREATE TYPE "LeadStatus" AS ENUM ('NEW','QUALIFIED','PROPOSAL_SENT','NEGOTIATION','WON','LOST'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT','ABSENT','LATE','HALF_DAY','REMOTE','LEAVE'); END IF; END $$`,
  ];
  for (const e of enums) await sql.query(e);

  console.log("Creating tables...");
  await sql.query(`CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, color TEXT NOT NULL, website TEXT, "parentId" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, phone TEXT, avatar TEXT, title TEXT, role "Role" DEFAULT 'EMPLOYEE', department "Department", status "EmployeeStatus" DEFAULT 'ACTIVE', "brandId" TEXT REFERENCES brands(id), "hireDate" TIMESTAMPTZ, salary DOUBLE PRECISION, currency TEXT DEFAULT 'USD', skills TEXT[] DEFAULT '{}', "managerId" TEXT REFERENCES users(id), "isActive" BOOLEAN DEFAULT true, "lastLogin" TIMESTAMPTZ, "twoFactorEnabled" BOOLEAN DEFAULT false, language TEXT DEFAULT 'en', timezone TEXT DEFAULT 'Asia/Karachi', "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), "companyName" TEXT NOT NULL, "contactName" TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, country TEXT, "countryFlag" TEXT, website TEXT, source TEXT, status "ClientStatus" DEFAULT 'ACTIVE', "healthScore" INT DEFAULT 80, mrr DOUBLE PRECISION DEFAULT 0, "brandId" TEXT NOT NULL REFERENCES brands(id), "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT, status "TaskStatus" DEFAULT 'TODO', priority "Priority" DEFAULT 'MEDIUM', department "Department", "assigneeId" TEXT REFERENCES users(id), "creatorId" TEXT NOT NULL REFERENCES users(id), "clientId" TEXT REFERENCES clients(id), "brandId" TEXT REFERENCES brands(id), "dueDate" TIMESTAMPTZ, "completedAt" TIMESTAMPTZ, "timeSpent" DOUBLE PRECISION DEFAULT 0, "order" INT DEFAULT 0, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), "companyName" TEXT NOT NULL, "contactName" TEXT NOT NULL, email TEXT, phone TEXT, country TEXT, "countryFlag" TEXT, services TEXT[] DEFAULT '{}', source TEXT, status "LeadStatus" DEFAULT 'NEW', value DOUBLE PRECISION DEFAULT 0, probability INT DEFAULT 50, "salesRepId" TEXT, "brandId" TEXT REFERENCES brands(id), "expectedClose" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), number TEXT UNIQUE NOT NULL, "clientId" TEXT NOT NULL REFERENCES clients(id), "brandId" TEXT NOT NULL REFERENCES brands(id), items JSONB NOT NULL, subtotal DOUBLE PRECISION NOT NULL, tax DOUBLE PRECISION DEFAULT 0, total DOUBLE PRECISION NOT NULL, status "InvoiceStatus" DEFAULT 'DRAFT', "issueDate" TIMESTAMPTZ NOT NULL, "dueDate" TIMESTAMPTZ NOT NULL, "paidDate" TIMESTAMPTZ, notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date DATE NOT NULL, "checkIn" TIMESTAMPTZ, "checkOut" TIMESTAMPTZ, status "AttendanceStatus" DEFAULT 'PRESENT', "hoursWorked" DOUBLE PRECISION DEFAULT 0, notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), UNIQUE("userId", date))`);
  await sql.query(`CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), content TEXT NOT NULL, "taskId" TEXT REFERENCES tasks(id) ON DELETE CASCADE, "authorId" TEXT NOT NULL REFERENCES users(id), "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), content TEXT NOT NULL, "clientId" TEXT REFERENCES clients(id) ON DELETE CASCADE, "authorId" TEXT NOT NULL REFERENCES users(id), "isPrivate" BOOLEAN DEFAULT false, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), filename TEXT NOT NULL, url TEXT NOT NULL, "mimeType" TEXT, size INT, "taskId" TEXT REFERENCES tasks(id) ON DELETE CASCADE, "clientId" TEXT REFERENCES clients(id) ON DELETE CASCADE, "uploadedById" TEXT NOT NULL REFERENCES users(id), "createdAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, "isRead" BOOLEAN DEFAULT false, data JSONB, "createdAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), action TEXT NOT NULL, entity TEXT NOT NULL, "entityId" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES users(id), changes JSONB, metadata JSONB, "ipAddress" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), "sessionToken" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL, expires TIMESTAMPTZ NOT NULL, "ipAddress" TEXT, "userAgent" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now())`);

  await sql.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, "entityId")`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs("userId")`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs("createdAt")`);

  console.log("All 13 tables created!");
}

async function seed() {
  console.log("\nSeeding data...");
  const hash = (pw) => bcrypt.hashSync(pw, 12);

  // Clean
  for (const t of ["audit_logs","notifications","attendance","attachments","comments","notes","invoices","tasks","leads","clients","sessions","users","brands"]) {
    await sql.query(`DELETE FROM ${t}`);
  }

  // Brands
  const [vcs] = await sql.query(`INSERT INTO brands (id, name, code, color, website, "parentId") VALUES ('b1','Virtual Customer Solution','VCS','#D4AF37','virtualcustomersolution.com','FU') RETURNING id`);
  const [bsl] = await sql.query(`INSERT INTO brands (id, name, code, color, website, "parentId") VALUES ('b2','Backup Solutions LLC','BSL','#3B82F6','backup-solutions.vercel.app','FU') RETURNING id`);
  const [dpl] = await sql.query(`INSERT INTO brands (id, name, code, color, website, "parentId") VALUES ('b3','Digital Point LLC','DPL','#22C55E','digitalpointllc.com','FU') RETURNING id`);
  console.log("Brands: VCS, BSL, DPL");

  // Users
  const users = [
    ["u1","Faizan","","faizi@digitalpointllc.com",hash("faizi13579"),"+92 300-1234567","Co-Founder & CEO","SUPER_ADMIN","LEADERSHIP","b3","2023-01-15",15000],
    ["u2","Umer","","umi@digitalpointllc.com",hash("umi84268"),"+92 300-7654321","Co-Founder & CTO","SUPER_ADMIN","LEADERSHIP","b3","2023-01-15",15000],
    ["u3","Ali","Hassan","ali@digitalpointllc.com",hash("specialist123"),"+92 333-5559876","Full Stack Developer","PROJECT_MANAGER","DEV","b1","2023-04-20",5500],
    ["u4","Ahmed","Khan","ahmed.khan@vcs.pk",hash("welcome123"),"+92 321-5551234","Senior SEO Manager","TEAM_LEAD","MARKETING","b1","2023-06-10",4500],
    ["u5","Fatima","Hassan","fatima.h@vcs.pk",hash("welcome123"),"+92 345-5553333","PPC Specialist","EMPLOYEE","MARKETING","b1","2024-01-08",3000],
    ["u6","Usman","Tariq","usman.t@vcs.pk",hash("welcome123"),"+92 300-5554444","Social Media Manager","EMPLOYEE","MARKETING","b1","2024-03-15",2500],
    ["u7","Hamza","Ali","hamza@backupsolutions.pk",hash("welcome123"),"+92 311-5552222","DevOps Engineer","TEAM_LEAD","DEV","b2","2023-08-01",5000],
    ["u8","Sarah","Williams","sarah@backupsolutions.pk",hash("welcome123"),"+1 555-5551111","AI Engineer","EMPLOYEE","DEV","b2","2024-02-01",6000],
    ["u9","Bilal","Rashid","bilal@vcs.pk",hash("welcome123"),"+92 322-5556666","Video Editor","EMPLOYEE","CREATIVE","b1","2024-06-01",2000],
    ["u10","Zainab","Malik","zainab@digitalpointllc.com",hash("welcome123"),"+92 315-5557777","Graphic Designer","EMPLOYEE","CREATIVE","b3","2024-04-10",2200],
    ["u11","Owais","Ahmed","owais@backupsolutions.pk",hash("welcome123"),"+92 302-5558888","Support Lead","TEAM_LEAD","SUPPORT","b2","2023-11-20",3500],
    ["u12","Nadia","Khan","nadia@vcs.pk",hash("welcome123"),"+92 331-5559999","HR Manager","DEPT_HEAD","ADMIN","b1","2023-09-01",4000],
    ["u13","Client","Demo","client@example.com",hash("viewer123"),"","Demo Viewer","EMPLOYEE","ADMIN","b1","2024-01-01",0],
  ];
  for (const u of users) {
    await sql.query(`INSERT INTO users (id,"firstName","lastName",email,"passwordHash",phone,title,role,department,"brandId","hireDate",salary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, u);
  }
  console.log("Users: 13 employees");

  // Clients
  const clientsData = [
    ["c1","Sarah Mitchell E-Commerce","Sarah Mitchell","sarah@ecommerce-brand.com","+1 415-555-0123","United States","US","Referral","ACTIVE",92,8500,"b1"],
    ["c2","SaaS Startup Client","Tech Founder","founder@saas-startup.io","+1 650-555-0124","United States","US","Website","ACTIVE",88,12000,"b1"],
    ["c3","Marketing Agency Partner","Agency Owner","owner@marketing-agency.co","+44 20-555-0125","United Kingdom","UK","LinkedIn","ACTIVE",95,5800,"b1"],
    ["c4","TechMart","Sarah Chen","sarah.chen@techmart.com","+1 555-0126","United States","US","Website","ACTIVE",94,15000,"b2"],
    ["c5","SecureBank","CISO","security@securebank.com","+1 212-555-0127","United States","US","Referral","ACTIVE",98,25000,"b2"],
    ["c6","DataFlow Analytics","CEO","ceo@dataflow.ai","+1 408-555-0128","United States","US","Cold Outreach","ACTIVE",91,18000,"b2"],
    ["c7","DTC E-Commerce Brand","Marcus Thompson","marcus@ecommerce-dtc.com","+1 310-555-0129","United States","US","Referral","ACTIVE",96,22000,"b3"],
    ["c8","B2B SaaS Company","Sarah Chen","sarah.chen@b2b-saas.io","+1 415-555-0130","United States","US","Website","ACTIVE",93,28000,"b3"],
  ];
  for (const c of clientsData) {
    await sql.query(`INSERT INTO clients (id,"companyName","contactName",email,phone,country,"countryFlag",source,status,"healthScore",mrr,"brandId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, c);
  }
  console.log("Clients: 8");

  // Tasks
  const tasksData = [
    ["t1","Monthly SEO Audit Report","IN_PROGRESS","HIGH","MARKETING","u4","u3","c1","b1","2026-04-05",6],
    ["t2","Meta Ads Campaign Optimization","IN_PROGRESS","URGENT","MARKETING","u1","u2","c7","b3","2026-04-02",8],
    ["t3","E-Commerce Platform Migration","IN_PROGRESS","HIGH","DEV","u3","u7","c4","b2","2026-04-08",12],
    ["t4","Banking Security Audit","TODO","URGENT","DEV","u7","u2","c5","b2","2026-04-04",0],
    ["t5","AI Analytics Dashboard","IN_PROGRESS","HIGH","DEV","u8","u7","c6","b2","2026-04-10",15],
    ["t6","Google Ads ROAS Optimization","REVIEW","MEDIUM","MARKETING","u2","u1","c8","b3","2026-04-03",10],
    ["t7","Content Calendar Q2","TODO","MEDIUM","MARKETING","u6","u4","c3","b1","2026-04-06",0],
    ["t8","PPC Campaign Setup","TODO","HIGH","MARKETING","u5","u3","c2","b1","2026-04-07",0],
  ];
  for (const t of tasksData) {
    await sql.query(`INSERT INTO tasks (id,title,status,priority,department,"assigneeId","creatorId","clientId","brandId","dueDate","timeSpent") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, t);
  }
  console.log("Tasks: 8");

  // Invoices
  const invoicesData = [
    ["i1","INV-2026-001","c5","b2",'[{"description":"Cybersecurity Audit Q1","quantity":1,"rate":25000}]',25000,0,25000,"PAID","2026-03-01","2026-03-15","2026-03-12"],
    ["i2","INV-2026-002","c7","b3",'[{"description":"Meta Ads Management","quantity":1,"rate":22000}]',22000,0,22000,"PAID","2026-03-01","2026-03-15","2026-03-14"],
    ["i3","INV-2026-003","c4","b2",'[{"description":"Platform Maintenance","quantity":1,"rate":15000}]',15000,0,15000,"PENDING","2026-03-15","2026-04-05",null],
    ["i4","INV-2026-004","c8","b3",'[{"description":"Attribution Setup","quantity":1,"rate":28000}]',28000,0,28000,"PENDING","2026-03-20","2026-04-10",null],
    ["i5","INV-2026-005","c1","b1",'[{"description":"AI CX Platform","quantity":1,"rate":8500}]',8500,0,8500,"OVERDUE","2026-02-28","2026-03-15",null],
    ["i6","INV-2026-006","c6","b2",'[{"description":"AI Dashboard Dev","quantity":1,"rate":18000}]',18000,0,18000,"PAID","2026-03-10","2026-03-25","2026-03-22"],
  ];
  for (const inv of invoicesData) {
    await sql.query(`INSERT INTO invoices (id,number,"clientId","brandId",items,subtotal,tax,total,status,"issueDate","dueDate","paidDate") VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12)`, inv);
  }
  console.log("Invoices: 6");

  // Leads
  const leadsData = [
    ["l1","Singapore FinTech","David Tan","david@sgfintech.sg","Singapore","PROPOSAL_SENT",8500,60,"b2"],
    ["l2","London Legal Services","James Wilson","james@llsolicitors.co.uk","United Kingdom","NEGOTIATION",4200,75,"b1"],
    ["l3","Lead Gen Agency","Jennifer Walsh","jennifer@leadgenagency.com","United States","QUALIFIED",15000,40,"b3"],
    ["l4","Tokyo Tech Ventures","Yuki Tanaka","yuki@tokyotech.jp","Japan","NEW",12000,20,"b2"],
    ["l5","Cape Town Logistics","Thabo Molefe","thabo@ctl.co.za","South Africa","WON",5600,100,"b1"],
    ["l6","Toronto E-Commerce","Mike Johnson","mike@toronto-ecom.ca","Canada","LOST",8000,0,"b3"],
  ];
  for (const l of leadsData) {
    await sql.query(`INSERT INTO leads (id,"companyName","contactName",email,country,status,value,probability,"brandId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, l);
  }
  console.log("Leads: 6");

  console.log("\n=== Database seeded! ===");
  console.log("Login credentials:");
  console.log("  Faizan (SUPER_ADMIN): faizi@digitalpointllc.com / faizi13579");
  console.log("  Umer (SUPER_ADMIN): umi@digitalpointllc.com / umi84268");
  console.log("  Ali Hassan (PM): ali@digitalpointllc.com / specialist123");
  console.log("  Demo: client@example.com / viewer123");
}

createSchema().then(() => seed()).catch(e => { console.error(e); process.exit(1); });
