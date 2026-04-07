// Delete fake clients + import 13 real clients from parsed-clients.json into Neon DB.
// Idempotent: re-running upserts by companyName.
//
// Run: node scripts/import-real-clients.mjs

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

// ─── Manual data for Johnny's Towing (parser missed it from GMB sheet) ───
const JOHNNY_TOWING = {
  name: "Johnny's Towing",
  email: "heatherabbiss@gmail.com",
  phone: "(208) 751-5036",
  contactPerson: "Heather Abbiss",
  address: "3390 N 2900 E, Twin Falls, ID 83301",
  website: "https://www.yelp.com/biz/johnny-s-towing-twin-falls",
  serviceAreas: ["Filer, ID", "Kimberly, ID", "Twin Falls, ID", "Curry, ID", "Knull, ID", "Godwin, ID", "Berger, ID"],
  keywords: [
    "Towing service in Twin Falls ID",
    "Roadside assistance in Twin Falls ID",
    "Emergency towing services",
    "Professional towing service near me",
    "24/7 towing services near me",
    "Towing service in Filer ID",
    "Towing service in Kimberly ID",
    "Emergency fuel delivery near me",
    "Vehicle recovery services near me",
    "Long distance towing in my area",
    "Motorcycle towing service",
    "Same day pickup near me",
    "Tire Changing Service in Filer",
    "Jump Start Services in my area",
  ],
  landingPages: [],
  notes: "Onboard: 4 Feb 2026. Need Video Verification. Yelp + MapQuest listings.",
  onboardDate: "2026-02-04",
};

// ─── Country detection from address ─────
function detectCountry(address) {
  if (!address) return "United States";
  const usStates = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
  if (usStates.test(address)) return "United States";
  return "United States";
}

// ─── Country flag ─────
function countryFlag(country) {
  const map = { "United States": "🇺🇸", "United Kingdom": "🇬🇧", "Canada": "🇨🇦" };
  return map[country] || "🌍";
}

async function deleteFakeClients() {
  console.log("\n═══ Cleaning fake clients ═══");

  // Get all current clients
  const all = await sql`SELECT id, "companyName" FROM clients`;
  console.log(`Found ${all.length} clients in DB:`);
  all.forEach((c) => console.log(`  - ${c.id} | ${c.companyName}`));

  if (all.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  // Delete in dependency order: notes, attachments, feedback, invoices, then clients
  // (tasks have nullable clientId so we just NULL them)
  const ids = all.map((c) => c.id);

  await sql`UPDATE tasks SET "clientId" = NULL WHERE "clientId" = ANY(${ids}::text[])`;
  console.log("✓ Detached tasks");

  await sql`DELETE FROM notes WHERE "clientId" = ANY(${ids}::text[])`;
  console.log("✓ Deleted notes");

  await sql`DELETE FROM attachments WHERE "clientId" = ANY(${ids}::text[])`;
  console.log("✓ Deleted attachments");

  await sql`DELETE FROM customer_feedback WHERE "clientId" = ANY(${ids}::text[])`;
  console.log("✓ Deleted feedback");

  await sql`DELETE FROM invoices WHERE "clientId" = ANY(${ids}::text[])`;
  console.log("✓ Deleted invoices");

  const deleted = await sql`DELETE FROM clients WHERE id = ANY(${ids}::text[]) RETURNING "companyName"`;
  console.log(`✓ Deleted ${deleted.length} clients`);
}

async function importRealClients() {
  console.log("\n═══ Importing real clients ═══");

  // Load parsed JSON
  const json = JSON.parse(fs.readFileSync("scripts/parsed-clients.json", "utf-8"));
  let clients = json.detailed;

  // Replace empty Johnny's Towing stub with real data
  clients = clients.map((c) => {
    const isJohnny = /johnny.*towing/i.test(c.name);
    if (isJohnny && !c.email) {
      return { ...JOHNNY_TOWING, name: c.name }; // Keep original name spelling
    }
    return c;
  });

  // Get DPL brand ID (all clients are DPL — they're managed by DPL)
  const brands = await sql`SELECT id FROM brands WHERE code = 'DPL' LIMIT 1`;
  const dplId = brands[0]?.id;
  if (!dplId) throw new Error("DPL brand not found");
  console.log(`✓ DPL brand: ${dplId}\n`);

  // Get an account manager (Faizan or Umer) for client assignment
  const founders = await sql`SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`;
  const accountManagerId = founders[0]?.id || null;

  for (const c of clients) {
    if (!c.name) continue;

    // Compose services list from keywords (top 5)
    const services = (c.keywords || []).slice(0, 5);

    // Map onboard date
    let onboardDate = null;
    if (c.onboardDate) {
      // Try to parse "17 Feb 2026", "2026-02-17", etc.
      const d = new Date(c.onboardDate);
      if (!isNaN(d.getTime())) onboardDate = d.toISOString();
    }

    const country = detectCountry(c.address);
    const flag = countryFlag(country);

    // Build a rich source string with all the metadata we have
    const sourceParts = [];
    if (c.address) sourceParts.push(`📍 ${c.address}`);
    if (c.website) sourceParts.push(`🌐 ${c.website}`);
    if (c.serviceAreas && c.serviceAreas.length) {
      sourceParts.push(`Service Areas: ${c.serviceAreas.join(", ")}`);
    }
    if (c.landingPages && c.landingPages.length) {
      sourceParts.push(`Landing Pages: ${c.landingPages.length}`);
    }
    const source = sourceParts.join(" | ");

    // Upsert by company name
    const existing = await sql`SELECT id FROM clients WHERE "companyName" = ${c.name} LIMIT 1`;

    if (existing.length > 0) {
      await sql`
        UPDATE clients SET
          "contactName" = ${c.contactPerson || "Unknown"},
          email = ${c.email || ""},
          phone = ${c.phone || null},
          country = ${country},
          "countryFlag" = ${flag},
          website = ${c.website || null},
          source = ${source.slice(0, 1000)},
          status = 'ACTIVE'::"ClientStatus",
          "healthScore" = 85,
          mrr = 0,
          "brandId" = ${dplId},
          services = ${services},
          "lastContactDate" = ${onboardDate},
          "accountManagerId" = ${accountManagerId},
          "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
      `;
      console.log(`  ↻ Updated  ${c.name}`);
    } else {
      const id = `cl_${crypto.randomUUID().slice(0, 12)}`;
      await sql`
        INSERT INTO clients (
          id, "companyName", "contactName", email, phone, country, "countryFlag",
          website, source, status, "healthScore", mrr, "brandId", services,
          "lastContactDate", "accountManagerId", "createdAt", "updatedAt"
        ) VALUES (
          ${id}, ${c.name}, ${c.contactPerson || "Unknown"}, ${c.email || ""},
          ${c.phone || null}, ${country}, ${flag},
          ${c.website || null}, ${source.slice(0, 1000)},
          'ACTIVE'::"ClientStatus", 85, 0, ${dplId}, ${services},
          ${onboardDate}, ${accountManagerId}, NOW(), NOW()
        )
      `;
      console.log(`  + Created  ${c.name}`);
    }

    // Add a note with the keyword list + landing pages for reference
    if ((c.keywords && c.keywords.length) || (c.landingPages && c.landingPages.length)) {
      const noteParts = [];
      if (c.keywords && c.keywords.length) {
        noteParts.push(`**Target Keywords (${c.keywords.length}):**\n${c.keywords.map((k) => `- ${k}`).join("\n")}`);
      }
      if (c.landingPages && c.landingPages.length) {
        noteParts.push(`\n**Landing Pages (${c.landingPages.length}):**\n${c.landingPages.map((l) => `- ${l}`).join("\n")}`);
      }
      if (c.serviceAreas && c.serviceAreas.length) {
        noteParts.push(`\n**Service Areas:**\n${c.serviceAreas.map((s) => `- ${s}`).join("\n")}`);
      }
      const noteContent = noteParts.join("\n");

      // Find the client we just inserted/updated
      const client = await sql`SELECT id FROM clients WHERE "companyName" = ${c.name} LIMIT 1`;
      if (client[0] && accountManagerId) {
        // Delete any old auto-generated notes first
        await sql`DELETE FROM notes WHERE "clientId" = ${client[0].id} AND content LIKE '%Target Keywords%'`;
        await sql`
          INSERT INTO notes (id, content, "clientId", "authorId", "isPrivate", "createdAt", "updatedAt")
          VALUES (${`note_${crypto.randomUUID().slice(0, 12)}`}, ${noteContent}, ${client[0].id}, ${accountManagerId}, false, NOW(), NOW())
        `;
      }
    }
  }

  console.log(`\n✅ Imported ${clients.length} clients`);
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Alpha CRM — Real Client Importer");
  console.log("═══════════════════════════════════════");

  await deleteFakeClients();
  await importRealClients();

  // Final count
  const total = await sql`SELECT COUNT(*)::int as count FROM clients`;
  console.log(`\n📋 Total clients in CRM: ${total[0].count}`);
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err.message);
  console.error(err);
  process.exit(1);
});
