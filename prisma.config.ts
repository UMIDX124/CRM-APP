import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (Neon unpooled URL lives there), then fall back
// to .env. dotenv won't overwrite vars that are already set, so the local
// file wins if both define the same key.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

/**
 * Prisma 7 config.
 *
 * Prisma 7 removed the `url = env("DATABASE_URL")` datasource field from
 * schema.prisma — migrate/pull/push/seed now read the connection string
 * from this file instead. Runtime (PrismaClient in src/lib/db.ts) still
 * uses the Neon adapter configured there.
 *
 * `dotenv/config` pulls DATABASE_URL from `.env.local` / `.env` so local
 * `prisma migrate deploy` runs without exporting it manually.
 */
export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    // Migrate requires a direct (non-pooled) connection. Neon exposes this
    // as DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING — fall back to the
    // pooled URL if neither is set (local Postgres / CI dry runs).
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      "",
  },
});
