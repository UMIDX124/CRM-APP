import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  niche: z.string().min(1).max(100),
  location: z.string().max(200).optional().nullable(),
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email(),
  senderPassword: z.string().min(1).max(200),
  dailyLimit: z.number().int().min(1).max(100).optional().default(30),
  sendingDays: z.string().optional().default("mon,tue,wed,thu,fri"),
  sendingHours: z.string().optional().default("09:00-17:00"),
  systemPrompt: z.string().max(5000).optional().nullable(),
  subjectLine: z.string().max(500).optional().nullable(),
  emailTemplate: z.string().max(10000).optional().nullable(),
  sequences: z
    .array(
      z.object({
        stepNumber: z.number().int().min(1),
        delayDays: z.number().int().min(0).max(60).optional().default(0),
        subject: z.string().min(1).max(500),
        bodyTemplate: z.string().min(1).max(10000),
      })
    )
    .optional()
    .default([]),
});

// GET — list campaigns for the user's company
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("cold-email-list", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const where: Record<string, unknown> = {};
    if (user.role !== "SUPER_ADMIN") {
      if (user.companyId) {
        where.companyId = user.companyId;
      } else {
        where.companyId = "__none__";
      }
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        niche: true,
        location: true,
        status: true,
        totalProspects: true,
        emailsSent: true,
        emailsOpened: true,
        replies: true,
        bounces: true,
        unsubscribes: true,
        senderName: true,
        senderEmail: true,
        dailyLimit: true,
        sendingDays: true,
        sendingHours: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { firstName: true, lastName: true } },
        _count: { select: { leads: true, sequences: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/cold-email error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new campaign
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("cold-email-create", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    if (!user.companyId) {
      return NextResponse.json({ error: "No company assigned" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Encrypt the sender password before storing
    const encryptedPassword = encrypt(data.senderPassword);

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: data.name,
        niche: data.niche,
        location: data.location || null,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderPassword: encryptedPassword,
        dailyLimit: data.dailyLimit,
        sendingDays: data.sendingDays,
        sendingHours: data.sendingHours,
        systemPrompt: data.systemPrompt || null,
        subjectLine: data.subjectLine || null,
        emailTemplate: data.emailTemplate || null,
        companyId: user.companyId,
        createdById: user.id,
        sequences: {
          create: data.sequences.map((seq) => ({
            stepNumber: seq.stepNumber,
            delayDays: seq.delayDays,
            subject: seq.subject,
            bodyTemplate: seq.bodyTemplate,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/cold-email error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
