import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    // Return a proxy that throws helpful errors when DB is not configured
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "$connect" || prop === "$disconnect" || prop === "then") return undefined;
        throw new Error(
          `Database not configured. Set DATABASE_URL environment variable. Attempted to access prisma.${String(prop)}`
        );
      },
    });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
