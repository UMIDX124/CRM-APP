import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFileSync } from "fs";

// Load DATABASE_URL from .env.local
const envContent = readFileSync(".env.local", "utf-8");
const dbMatch = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const url = dbMatch?.[1];
if (!url) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }

const adapter = new PrismaNeon({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const sites = [
  { name: "Digital Point LLC", domain: "digitalpointllc.com" },
  { name: "Virtual Customer Solutions", domain: "virtualcustomersolution.com" },
  { name: "Backup Solutions", domain: "backupsolutions.com" },
];

async function main() {
  console.log("Seeding tracked sites...\n");

  for (const site of sites) {
    const existing = await prisma.trackedSite.findUnique({ where: { domain: site.domain } });
    if (existing) {
      console.log(`  ✓ ${site.name} (${site.domain}) — already exists`);
      console.log(`    API Key: ${existing.apiKey}\n`);
      continue;
    }

    const created = await prisma.trackedSite.create({ data: site });
    console.log(`  ✅ ${site.name} (${site.domain}) — created`);
    console.log(`    API Key: ${created.apiKey}\n`);
  }

  const all = await prisma.trackedSite.findMany({ orderBy: { createdAt: "asc" } });
  console.log("═══════════════════════════════════════════");
  console.log("SITE API KEYS");
  console.log("═══════════════════════════════════════════");
  for (const s of all) {
    console.log(`${s.name.padEnd(30)} ${s.apiKey}`);
  }
  console.log("═══════════════════════════════════════════");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
