// Phase 7 backfill: seed FU Corp company + link existing brands via companyId
// Idempotent — safe to re-run.
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const adapter = new PrismaNeon({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("→ Phase 7 backfill: companies + brands.companyId");

  // 1. Upsert FU Corp company
  const fu = await prisma.company.upsert({
    where: { code: "FU" },
    update: {},
    create: {
      name: "FU Corp",
      code: "FU",
      legalName: "FU Corporation LLC",
      description:
        "Mother company. Operates VCS, BSL, and DPL as wholly-owned subsidiaries.",
      website: "fucorp.com",
      industry: "Technology / Marketing Services",
      timezone: "Asia/Karachi",
      currency: "USD",
      locale: "en",
      isActive: true,
    },
  });
  console.log(`  ✓ FU Corp company: id=${fu.id}`);

  // 2. Backfill every brand whose parentId == "FU" (or whose companyId is null)
  //    to point at FU Corp's company id.
  const updated = await prisma.brand.updateMany({
    where: {
      OR: [{ parentId: "FU" }, { companyId: null }],
    },
    data: { companyId: fu.id },
  });
  console.log(`  ✓ Brands linked to FU Corp: ${updated.count}`);

  // 3. Print final state for verification
  const brands = await prisma.brand.findMany({
    select: { code: true, name: true, companyId: true, parentId: true },
    orderBy: { code: "asc" },
  });
  console.table(brands);

  const companies = await prisma.company.findMany({
    select: { id: true, code: true, name: true, _count: { select: { brands: true } } },
  });
  console.table(companies);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("✗ backfill failed:", e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
