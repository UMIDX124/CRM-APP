import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { verifyBatch } from "@/lib/cold-email/verifier";
import { z } from "zod";

export const maxDuration = 60;

const verifySchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});

// POST — batch verify email addresses
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("email-verify", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const results = await verifyBatch(parsed.data.emails, 5);

    // Update prospect records in DB
    const now = new Date();
    for (const result of results) {
      try {
        await prisma.prospect.updateMany({
          where: {
            email: result.email,
            ...(user.companyId ? { companyId: user.companyId } : {}),
          },
          data: {
            emailStatus: result.status,
            verifiedAt: now,
          },
        });
      } catch {
        // Skip update errors for individual emails
      }
    }

    const summary = {
      total: results.length,
      valid: results.filter((r) => r.status === "valid").length,
      invalid: results.filter((r) => r.status === "invalid").length,
      risky: results.filter((r) => r.status === "risky").length,
      disposable: results.filter((r) => r.status === "disposable").length,
    };

    return NextResponse.json({ results, summary });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/email/verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
