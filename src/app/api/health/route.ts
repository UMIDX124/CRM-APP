import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health
 *
 * Liveness + readiness probe for monitoring and post-deploy verification.
 * Returns DB status, latest applied migration, and an uptime hint. Public
 * (no auth) so external uptime monitors can hit it without credentials.
 */
const startedAt = Date.now();

export async function GET() {
  let dbOk = false;
  let dbLatencyMs = -1;
  let migration: string | null = null;

  try {
    const t0 = Date.now();
    // Cheap query that touches the connection pool
    const result = await prisma.$queryRawUnsafe<Array<{ now: Date }>>(
      "SELECT NOW() as now"
    );
    dbLatencyMs = Date.now() - t0;
    dbOk = result.length > 0;
  } catch {
    dbOk = false;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ migration_name: string }>
    >(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`
    );
    migration = rows[0]?.migration_name ?? null;
  } catch {
    migration = null;
  }

  return NextResponse.json(
    {
      status: dbOk ? "healthy" : "degraded",
      uptimeMs: Date.now() - startedAt,
      database: {
        ok: dbOk,
        latencyMs: dbLatencyMs,
        latestMigration: migration,
      },
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}
