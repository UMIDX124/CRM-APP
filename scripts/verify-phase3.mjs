import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const companies = await prisma.company.findMany({
  include: { _count: { select: { brands: true } } },
});
console.log("Companies:");
console.table(
  companies.map((c) => ({ code: c.code, name: c.name, brands: c._count.brands }))
);
const brands = await prisma.brand.findMany({
  select: { code: true, name: true, companyId: true },
  orderBy: { code: "asc" },
});
console.log("Brands (parentId column dropped):");
console.table(brands);
await prisma.$disconnect();
