import { NextResponse } from "next/server";
import { recalcAllClientHealth } from "@/lib/scoring";

// Vercel Cron: runs daily at 12:00 PM PKT (07:00 UTC).
// Recomputes every active client's health score from the latest
// invoice / ticket / task activity.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recalcAllClientHealth();
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      skipped: result.skipped,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron.health-recalc] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
