// Seed real Alpha employees from the salary sheet.
// - Adds pinCode column if missing
// - Inserts/updates employees with bcrypt password + 4-digit PIN
// - Sets up manager hierarchy
// - Adds them to relevant chat channels (#general + brand-team + role-based)
// - Outputs a credentials report
//
// Run: node scripts/seed-real-employees.mjs

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

// ─── Employee roster (22 people, M.Umer Farooq excluded) ──────
// Brand for everyone: DPL (b3) — they all work under Digital Point LLC
// Roles map: SUPER_ADMIN > PROJECT_MANAGER > DEPT_HEAD > TEAM_LEAD > EMPLOYEE
// Department enum: LEADERSHIP, MARKETING, DEV, CREATIVE, SUPPORT, ADMIN, SALES, OPS
const EMPLOYEES = [
  // ─ Management ─
  { name: "Shahzaib Abid",     dept: "ADMIN",      role: "DEPT_HEAD",       title: "Manager" },
  { name: "Anwaar Tayyab",     dept: "ADMIN",      role: "DEPT_HEAD",       title: "Chief Financial Officer (CA)" },
  { name: "Faeez Bhutta",      dept: "MARKETING",  role: "DEPT_HEAD",       title: "Social Media Manager" },
  { name: "Ansar Abass",       dept: "SALES",      role: "DEPT_HEAD",       title: "Sales Manager" },
  { name: "M. Muneeb",         dept: "DEV",        role: "DEPT_HEAD",       title: "Tech Head" },

  // ─ Sales ─
  { name: "Taha",              dept: "SALES",      role: "TEAM_LEAD",       title: "Sales Head" },
  { name: "Usman",             dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Ali Daim",          dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Ahad",              dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Rabia",             dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Ibrahim",           dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Maryam",            dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Ameer Hamza",       dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },
  { name: "Adeel",             dept: "SALES",      role: "EMPLOYEE",        title: "Sales Agent" },

  // ─ Tech ─
  { name: "Amanat",            dept: "DEV",        role: "EMPLOYEE",        title: "SEO Expert" },
  { name: "Azam",              dept: "CREATIVE",   role: "EMPLOYEE",        title: "Designer (Intern)" },
  { name: "Zain Intern",       dept: "DEV",        role: "EMPLOYEE",        title: "Web Development Intern" },
  { name: "Faraz",             dept: "MARKETING",  role: "TEAM_LEAD",       title: "Ads Manager" },
  { name: "Zain Dev",          dept: "DEV",        role: "EMPLOYEE",        title: "Web Developer" },
  { name: "Suleman",           dept: "DEV",        role: "EMPLOYEE",        title: "Full Stack Developer" },
  { name: "Minahil",           dept: "DEV",        role: "EMPLOYEE",        title: "Web Development Intern" },

  // ─ Other ─
  { name: "Hafiz Islam",       dept: "OPS",        role: "EMPLOYEE",        title: "Field Work" },
  { name: "Zeeshan",           dept: "OPS",        role: "EMPLOYEE",        title: "Office Boy" },
];

// Generate a slug-style email-friendly key from a full name
function emailSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

// Generate a memorable but secure password: FirstName + 4 digits + #
function generatePassword(firstName) {
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${firstName.replace(/\s+/g, "")}${digits}#`;
}

// Generate a unique 4-digit PIN
function generatePin(used) {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(pin));
  used.add(pin);
  return pin;
}

async function ensurePinColumn() {
  console.log("Ensuring pinCode column exists...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "pinCode" TEXT`;
  console.log("✓ pinCode column ready");
}

async function seedEmployees() {
  await ensurePinColumn();

  // Get DPL brand ID
  const brands = await sql`SELECT id FROM brands WHERE code = 'DPL' LIMIT 1`;
  const dplId = brands[0]?.id;
  if (!dplId) throw new Error("DPL brand not found in database");
  console.log(`✓ DPL brand: ${dplId}`);

  // Reserve PINs already in use so we don't collide
  const existingPins = await sql`SELECT "pinCode" FROM users WHERE "pinCode" IS NOT NULL`;
  const usedPins = new Set(existingPins.map((r) => r.pinCode).filter(Boolean));
  // Reserve 0000-0099 for system/admin use
  for (let i = 0; i < 100; i++) usedPins.add(String(i).padStart(4, "0"));

  // Get all chat channels
  const channels = await sql`SELECT id, name FROM channels`;
  const channelMap = Object.fromEntries(channels.map((c) => [c.name, c.id]));

  const credentials = [];

  // First pass: create or update each employee
  for (const emp of EMPLOYEES) {
    const parts = emp.name.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "";
    const slug = emailSlug(emp.name);
    const email = emp.emailOverride || `${slug}@digitalpointllc.com`;
    const password = generatePassword(firstName);
    const passwordHash = await bcrypt.hash(password, 10);
    const pinCode = generatePin(usedPins);

    // Upsert by email
    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;

    let userId;
    if (existing.length > 0) {
      // Update existing user
      userId = existing[0].id;
      await sql`
        UPDATE users SET
          "passwordHash" = ${passwordHash},
          "pinCode" = ${pinCode},
          "firstName" = ${firstName},
          "lastName" = ${lastName},
          title = ${emp.title},
          role = ${emp.role}::"Role",
          department = ${emp.dept}::"Department",
          status = 'ACTIVE'::"EmployeeStatus",
          "brandId" = ${dplId},
          "isActive" = true,
          "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
      console.log(`  ↻ Updated  ${emp.name.padEnd(20)} ${email}`);
    } else {
      // Insert new user
      const id = `emp_${crypto.randomUUID().slice(0, 12)}`;
      await sql`
        INSERT INTO users (
          id, email, "passwordHash", "pinCode", "firstName", "lastName",
          title, role, department, status, "brandId",
          "hireDate", currency, "isActive", language, timezone, "createdAt", "updatedAt"
        ) VALUES (
          ${id}, ${email}, ${passwordHash}, ${pinCode}, ${firstName}, ${lastName},
          ${emp.title}, ${emp.role}::"Role", ${emp.dept}::"Department",
          'ACTIVE'::"EmployeeStatus", ${dplId},
          NOW(), 'USD', true, 'en', 'Asia/Karachi', NOW(), NOW()
        )
      `;
      userId = id;
      console.log(`  + Created  ${emp.name.padEnd(20)} ${email}`);
    }

    credentials.push({
      name: emp.name,
      email,
      password,
      pinCode,
      role: emp.role,
      department: emp.dept,
      title: emp.title,
      userId,
    });

    // ─── Add to chat channels ──────────────────────
    // Everyone joins #general and #dpl-team
    const channelsToJoin = ["general", "dpl-team"];

    // Sales-related: also join #leads
    if (emp.dept === "SALES" || emp.dept === "MARKETING") {
      channelsToJoin.push("leads");
    }

    // Tech-related: also join #tasks
    if (emp.dept === "DEV" || emp.role === "DEPT_HEAD") {
      channelsToJoin.push("tasks");
    }

    // Heads also get #leads + #tasks
    if (emp.role === "DEPT_HEAD") {
      if (!channelsToJoin.includes("leads")) channelsToJoin.push("leads");
      if (!channelsToJoin.includes("tasks")) channelsToJoin.push("tasks");
    }

    for (const chanName of channelsToJoin) {
      const chanId = channelMap[chanName];
      if (!chanId) continue;
      const chanRole = emp.role === "DEPT_HEAD" || emp.role === "PROJECT_MANAGER" ? "ADMIN" : "MEMBER";
      await sql`
        INSERT INTO channel_members (id, "channelId", "userId", role, "joinedAt")
        VALUES (gen_random_uuid()::text, ${chanId}, ${userId}, ${chanRole}, NOW())
        ON CONFLICT ("channelId", "userId") DO UPDATE SET role = ${chanRole}
      `;
    }
  }

  // Second pass: set up manager hierarchy
  console.log("\nSetting up manager hierarchy...");
  const findId = (name) => credentials.find((c) => c.name === name)?.userId;

  // Top of pyramid: report to existing SUPER_ADMINs (Faizan / Umer)
  // Department Heads report directly to leadership (no managerId set — they're the top)
  // Sales agents report to Taha (Sales Head) who reports to Ansar (Sales Manager)
  // Tech employees report to M. Muneeb
  // Designer/marketing → Faeez
  // Faraz (Ads) → Faeez

  const hierarchy = [
    // Sales chain
    { employee: "Usman",        manager: "Taha" },
    { employee: "Ali Daim",     manager: "Taha" },
    { employee: "Ahad",         manager: "Taha" },
    { employee: "Rabia",        manager: "Taha" },
    { employee: "Ibrahim",      manager: "Taha" },
    { employee: "Maryam",       manager: "Taha" },
    { employee: "Ameer Hamza",  manager: "Taha" },
    { employee: "Adeel",        manager: "Taha" },
    { employee: "Taha",         manager: "Ansar Abass" },

    // Tech chain
    { employee: "Amanat",       manager: "M. Muneeb" },
    { employee: "Zain Dev",     manager: "M. Muneeb" },
    { employee: "Suleman",      manager: "M. Muneeb" },
    { employee: "Zain Intern",  manager: "M. Muneeb" },
    { employee: "Minahil",      manager: "M. Muneeb" },

    // Marketing/Creative chain
    { employee: "Faraz",        manager: "Faeez Bhutta" },
    { employee: "Azam",         manager: "Faeez Bhutta" },

    // Admin chain
    { employee: "Hafiz Islam",  manager: "Shahzaib Abid" },
    { employee: "Zeeshan",      manager: "Shahzaib Abid" },
  ];

  for (const link of hierarchy) {
    const empId = findId(link.employee);
    const mgrId = findId(link.manager);
    if (empId && mgrId) {
      await sql`UPDATE users SET "managerId" = ${mgrId} WHERE id = ${empId}`;
      console.log(`  ${link.employee.padEnd(15)} → ${link.manager}`);
    }
  }

  return credentials;
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Alpha CRM — Real Employee Seeder");
  console.log("═══════════════════════════════════════\n");

  const creds = await seedEmployees();

  // Write credentials report
  const reportPath = path.join(process.cwd(), "EMPLOYEE_CREDENTIALS.md");
  const lines = [
    "# Alpha CRM — Employee Credentials",
    "",
    "**⚠️ CONFIDENTIAL — Share securely with each employee individually.**",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total employees: ${creds.length}`,
    "",
    "All employees are assigned to **Digital Point LLC (DPL)**.",
    "",
    "Each employee can:",
    "- Sign in to the CRM at https://fu-corp-crm.vercel.app/login",
    "- Use their 4-digit PIN at the kiosk for attendance check-in",
    "- Access the Team Chat (Alpha AI assistant + channels) based on their role",
    "",
    "## Channel Access by Role",
    "",
    "| Role | Channels |",
    "|---|---|",
    "| Department Heads | #general, #dpl-team, #leads, #tasks (as ADMIN) |",
    "| Sales Team Lead | #general, #dpl-team, #leads |",
    "| Sales Agents | #general, #dpl-team, #leads |",
    "| Marketing/Ads | #general, #dpl-team, #leads |",
    "| Tech/Dev | #general, #dpl-team, #tasks |",
    "| Creative | #general, #dpl-team |",
    "| Field/Office | #general, #dpl-team |",
    "",
    "---",
    "",
    "## Credentials",
    "",
    "| Name | Email | Password | PIN | Role | Title |",
    "|---|---|---|---|---|---|",
  ];
  for (const c of creds) {
    lines.push(`| ${c.name} | \`${c.email}\` | \`${c.password}\` | \`${c.pinCode}\` | ${c.role} | ${c.title} |`);
  }
  lines.push("", "---", "", "## Hierarchy", "");
  lines.push("**Leadership (Existing Super Admins):** Faizan, Umer");
  lines.push("");
  lines.push("**Department Heads (report to Leadership):**");
  lines.push("- Shahzaib Abid — Admin Manager");
  lines.push("- Faeez Bhutta — Marketing/Social");
  lines.push("- Ansar Abass — Sales Manager");
  lines.push("- M. Muneeb — Tech Head");
  lines.push("");
  lines.push("**Sales Chain:** Ansar Abass → Taha (Sales Head) → 8 Sales Agents");
  lines.push("**Tech Chain:** M. Muneeb → SEO/Devs/Interns (5 people)");
  lines.push("**Marketing Chain:** Faeez Bhutta → Faraz (Ads), Azam (Designer)");
  lines.push("**Admin Chain:** Shahzaib Abid → Hafiz Islam (Field), Zeeshan (Office)");

  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`\n✅ Done. Wrote credentials report to ${reportPath}`);
  console.log(`📋 Total employees seeded: ${creds.length}`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
