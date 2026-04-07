// Parse Clients Data.xlsx — extract all 13 clients with full structured data.
// Run: node scripts/parse-clients.mjs

import XLSX from "xlsx";
import fs from "fs";

const wb = XLSX.readFile("E:/Clients Data.xlsx");

// ─── Sheet 1: Master onboard list ─────
const masterSheet = XLSX.utils.sheet_to_json(wb.Sheets["Clients On board Dates"], { header: 1, defval: "" });
const masterClients = [];
for (let i = 1; i < masterSheet.length; i++) {
  const row = masterSheet[i];
  if (!row[1]) continue;
  const serial = row[0];
  let dateStr = "";
  if (typeof serial === "number") {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    dateStr = d.toISOString().split("T")[0];
  }
  masterClients.push({ name: String(row[1]).trim(), onboardDate: dateStr });
}

// ─── Sheet 3: Landing Pages — per-client detail blocks ─────
const lp = XLSX.utils.sheet_to_json(wb.Sheets["Landing Pages Data (2026)"], { header: 1, defval: "" });

// Build a list of known client names from the master list for name detection
const knownNames = masterClients.map((c) => c.name.toLowerCase());

// Header detection: a row is a client header if col A matches a known name
function isClientHeader(row) {
  const colA = String(row[0] || "").trim();
  if (!colA) return false;
  if (colA.toLowerCase().startsWith("onboard")) return false;
  if (colA.startsWith("http")) return false;
  // Match any known client name (fuzzy — startsWith works for variants)
  return knownNames.some((n) => colA.toLowerCase().startsWith(n.slice(0, 10)) || n.startsWith(colA.toLowerCase().slice(0, 10)));
}

const blocks = [];
let current = null;
for (let i = 0; i < lp.length; i++) {
  const row = lp[i];
  if (isClientHeader(row)) {
    if (current) blocks.push(current);
    current = { name: String(row[0]).trim(), startRow: i, rows: [row] };
  } else if (current) {
    current.rows.push(row);
  }
}
if (current) blocks.push(current);

// Extract structured data per block
function extractClient(block) {
  const result = {
    name: block.name,
    email: "",
    phone: "",
    contactPerson: "",
    address: "",
    website: "",
    serviceAreas: [],
    keywords: [],
    landingPages: [],
    notes: "",
    onboardDate: "",
  };

  for (const row of block.rows) {
    const a = String(row[0] || "").trim();
    const b = String(row[1] || "").trim();
    const c = String(row[2] || "").trim();
    const d = String(row[3] || "").trim();
    const e = String(row[4] || "").trim();

    // Email — col E
    if (e.includes("@") && !result.email) result.email = e;

    // Phone — col C with digits
    if (c && /\d{3}/.test(c)) {
      if (!result.phone) result.phone = c;
      // Extract contact person from "(919)665-9072 (Mohamed)"
      const personMatch = c.match(/\(([^)]+)\)\s*$/);
      if (personMatch && !/^\d/.test(personMatch[1]) && !result.contactPerson) {
        result.contactPerson = personMatch[1].trim();
      }
    }

    // Address — col B with city/state pattern
    if (b && b.includes(",") && /[A-Z]{2}/.test(b) && !b.startsWith("http") && !result.address) {
      // Skip "City, ST" service area entries (those are short)
      if (b.length > 15) result.address = b;
    }

    // Onboard date
    if (a.toLowerCase().startsWith("onboard")) {
      result.notes = a;
      const m = a.match(/onboard:?\s*(.+)/i);
      if (m) result.onboardDate = m[1].trim();
    }

    // Website — non-citation https URL
    if (b.startsWith("https://") && !b.includes("citation.digitalpointllc") && !b.includes("yelp.com") && !b.includes("mapquest")) {
      if (!result.website) result.website = b;
    }
    if (a === "Website" && b.startsWith("http")) result.website = b;

    // Landing pages
    if (b.startsWith("https://citation.digitalpointllc.com")) result.landingPages.push(b);

    // Service areas — short "City, ST" entries in col B
    if (b && b.match(/^[A-Z][a-zA-Z .]+,\s*[A-Z]{2}/) && b.length < 50) {
      result.serviceAreas.push(b);
    }

    // Keywords — col D non-empty, non-header
    if (d && d.length > 4 && !/^(keyword|general|provided|service|block|competitor)/i.test(d)) {
      result.keywords.push(d);
    }
  }

  result.serviceAreas = [...new Set(result.serviceAreas)];
  result.keywords = [...new Set(result.keywords)];
  result.landingPages = [...new Set(result.landingPages)];
  return result;
}

const clients = blocks.map(extractClient);

// ─── Sheet 2: GMB Clients Data — extract Johnny's Towing ─────
const gmb = XLSX.utils.sheet_to_json(wb.Sheets["GMB Clients Data (2026)"], { header: 1, defval: "" });
if (gmb.length > 0) {
  const johnny = {
    name: "Johnny's Towing",
    email: "",
    phone: "",
    contactPerson: "",
    address: "",
    website: "",
    serviceAreas: [],
    keywords: [],
    landingPages: [],
    notes: "",
    onboardDate: "",
  };

  for (const row of gmb) {
    const a = String(row[0] || "").trim();
    const b = String(row[1] || "").trim();
    const c = String(row[2] || "").trim();
    const d = String(row[3] || "").trim();
    const e = String(row[4] || "").trim();

    if (e.includes("@") && !johnny.email) johnny.email = e;
    if (e.includes("@") && johnny.email && e !== johnny.email) johnny.email += `, ${e}`;

    if (c && /\d{3}/.test(c)) {
      if (!johnny.phone) johnny.phone = c;
      const personMatch = c.match(/\(?([a-zA-Z][a-zA-Z\s]+)\)?$/);
      if (personMatch && !johnny.contactPerson) johnny.contactPerson = personMatch[1].trim();
    }

    if (a.toLowerCase().startsWith("onboard")) {
      johnny.notes = a;
      const m = a.match(/onboard:?\s*(.+)/i);
      if (m) johnny.onboardDate = m[1].trim();
    }
    // Address: col B with comma + state-like pattern
    if (b && b.includes(",") && /\d/.test(b) && !johnny.address && !b.startsWith("http")) {
      johnny.address = b;
    }
    if (a.startsWith("https://www.yelp") || a.startsWith("https://www.mapquest")) {
      // External listings — keep as notes
      if (!johnny.website && a.startsWith("https://www.yelp")) johnny.website = a;
    }
    if (b && !b.startsWith("http") && !b.includes(",") && b.length > 1 && b.length < 30) {
      johnny.serviceAreas.push(b);
    }
    if (d && d.length > 4 && !/^(keyword|service area|provided)/i.test(d)) {
      johnny.keywords.push(d);
    }
  }
  johnny.serviceAreas = [...new Set(johnny.serviceAreas)].filter((s) => !["", " "].includes(s));
  johnny.keywords = [...new Set(johnny.keywords)];

  // Insert Johnny at the start since it was first onboarded
  clients.unshift(johnny);
}

// Match each client to its master onboard date
for (const c of clients) {
  if (!c.onboardDate) {
    const m = masterClients.find((mc) => mc.name.toLowerCase() === c.name.toLowerCase() ||
      mc.name.toLowerCase().includes(c.name.toLowerCase().slice(0, 10)));
    if (m) c.onboardDate = m.onboardDate;
  }
}

// Find any clients in master list missing from detail
const detailNames = clients.map((c) => c.name.toLowerCase());
for (const m of masterClients) {
  const matches = detailNames.some((d) => d.includes(m.name.toLowerCase().slice(0, 10)) || m.name.toLowerCase().includes(d.slice(0, 10)));
  if (!matches) {
    console.log(`⚠ Missing from detail: ${m.name} — adding stub`);
    clients.push({
      name: m.name,
      email: "",
      phone: "",
      contactPerson: "",
      address: "",
      website: "",
      serviceAreas: [],
      keywords: [],
      landingPages: [],
      notes: "",
      onboardDate: m.onboardDate,
    });
  }
}

console.log("\n=== EXTRACTED CLIENTS ===");
clients.forEach((c, i) => {
  console.log(`\n[${i+1}] ${c.name}`);
  console.log(`    Email:    ${c.email || "(none)"}`);
  console.log(`    Phone:    ${c.phone || "(none)"}`);
  console.log(`    Contact:  ${c.contactPerson || "(none)"}`);
  console.log(`    Address:  ${c.address || "(none)"}`);
  console.log(`    Website:  ${c.website || "(none)"}`);
  console.log(`    Areas:    ${c.serviceAreas.length}`);
  console.log(`    Keywords: ${c.keywords.length}`);
  console.log(`    Pages:    ${c.landingPages.length}`);
  console.log(`    Onboard:  ${c.onboardDate}`);
});

fs.writeFileSync("scripts/parsed-clients.json", JSON.stringify({ master: masterClients, detailed: clients }, null, 2));
console.log(`\n✅ Total: ${clients.length} clients → scripts/parsed-clients.json`);
