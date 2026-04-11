import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  dailyLimit: z.number().int().min(1).max(100).optional(),
  sendingDays: z.string().optional(),
  sendingHours: z.string().optional(),
  systemPrompt: z.string().max(5000).optional().nullable(),
  subjectLine: z.string().max(500).optional().nullable(),
  emailTemplate: z.string().max(10000).optional().nullable(),
  senderName: z.string().min(1).max(100).optional(),
  senderEmail: z.string().email().optional(),
  senderPassword: z.string().min(1).max(200).optional(),
});

async function getCampaignForUser(id: string, user: { id: string; role: string; companyId: string | null }) {
  const where: Record<string, unknown> = { id };
  if (user.role !== "SUPER_ADMIN") {
    if (user.companyId) {
      where.companyId = user.companyId;
    } else {
      return null;
    }
  }
  return prisma.emailCampaign.findFirst({ where });
}

// GET — campaign detail
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rl = await rateLimit("cold-email-detail", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const where: Record<string, unknown> = { id };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }

    const campaign = await prisma.emailCampaign.findFirst({
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
        // senderPassword deliberately excluded
        dailyLimit: true,
        sendingDays: true,
        sendingHours: true,
        systemPrompt: true,
        subjectLine: true,
        emailTemplate: true,
        companyId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { firstName: true, lastName: true } },
        sequences: {
          orderBy: { stepNumber: "asc" },
          select: {
            id: true,
            stepNumber: true,
            delayDays: true,
            subject: true,
            bodyTemplate: true,
          },
        },
        _count: { select: { leads: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Lead status breakdown
    const statusCounts = await prisma.campaignLead.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    });

    const leadStats: Record<string, number> = {};
    for (const s of statusCounts) {
      leadStats[s.status] = s._count;
    }

    // Recent sent emails
    const recentEmails = await prisma.sentEmail.findMany({
      where: { campaignLead: { campaignId: id } },
      orderBy: { sentAt: "desc" },
      take: 20,
      select: {
        id: true,
        subject: true,
        status: true,
        sentAt: true,
        messageId: true,
        campaignLead: {
          select: {
            prospect: { select: { email: true, firstName: true, company: true } },
          },
        },
      },
    });

    return NextResponse.json({ campaign, leadStats, recentEmails });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/cold-email/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update campaign
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rl = await rateLimit("cold-email-update", req, { limit: 20, windowSec: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const existing = await getCampaignForUser(id, user);
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dailyLimit !== undefined) updateData.dailyLimit = data.dailyLimit;
    if (data.sendingDays !== undefined) updateData.sendingDays = data.sendingDays;
    if (data.sendingHours !== undefined) updateData.sendingHours = data.sendingHours;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.subjectLine !== undefined) updateData.subjectLine = data.subjectLine;
    if (data.emailTemplate !== undefined) updateData.emailTemplate = data.emailTemplate;
    if (data.senderName !== undefined) updateData.senderName = data.senderName;
    if (data.senderEmail !== undefined) updateData.senderEmail = data.senderEmail;
    if (data.senderPassword !== undefined) updateData.senderPassword = encrypt(data.senderPassword);

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/cold-email/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete campaign (draft only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await getCampaignForUser(id, user);
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    if (existing.status !== "draft") {
      return NextResponse.json({ error: "Only draft campaigns can be deleted" }, { status: 400 });
    }

    await prisma.emailCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/cold-email/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
