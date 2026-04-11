import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { decrypt } from "@/lib/crypto";
import { sendColdEmail } from "@/lib/cold-email/sender";
import { buildUnsubscribeUrl } from "@/lib/cold-email/unsubscribe";
import { z } from "zod";

export const maxDuration = 300;

const sendSchema = z.object({
  campaignId: z.string(),
  batchSize: z.number().int().min(1).max(50).optional().default(10),
});

function isWithinSendingHours(sendingHours: string): boolean {
  try {
    const [startStr, endStr] = sendingHours.split("-");
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    const now = new Date();
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return true; // Default to allowing if parsing fails
  }
}

function isSendingDay(sendingDays: string): boolean {
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = dayNames[new Date().getUTCDay()];
  const allowed = sendingDays.toLowerCase().split(",").map((d) => d.trim());
  return allowed.includes(today);
}

// POST — send a batch of emails for a campaign
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const rl = await rateLimit("email-send", req, { limit: 10, windowSec: 3600 }, user.id);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { campaignId, batchSize } = parsed.data;

    // Fetch campaign with access check
    const where: Record<string, unknown> = { id: campaignId };
    if (user.role !== "SUPER_ADMIN" && user.companyId) {
      where.companyId = user.companyId;
    }

    const campaign = await prisma.emailCampaign.findFirst({
      where,
      select: {
        id: true,
        status: true,
        senderName: true,
        senderEmail: true,
        senderPassword: true,
        dailyLimit: true,
        sendingDays: true,
        sendingHours: true,
        emailsSent: true,
        sequences: {
          orderBy: { stepNumber: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "active") {
      return NextResponse.json({ error: "Campaign is not active" }, { status: 400 });
    }

    // Check sending window
    if (!isSendingDay(campaign.sendingDays)) {
      return NextResponse.json({ error: "Not a sending day", sent: 0 });
    }
    if (!isWithinSendingHours(campaign.sendingHours)) {
      return NextResponse.json({ error: "Outside sending hours", sent: 0 });
    }

    // Check daily limit — count emails sent today
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const sentToday = await prisma.sentEmail.count({
      where: {
        campaignLead: { campaignId },
        sentAt: { gte: todayStart },
      },
    });

    const remaining = Math.max(0, campaign.dailyLimit - sentToday);
    if (remaining === 0) {
      return NextResponse.json({ error: "Daily limit reached", sent: 0, dailyLimit: campaign.dailyLimit });
    }

    const actualBatch = Math.min(batchSize, remaining);

    // Fetch queued leads with generated emails
    const leads = await prisma.campaignLead.findMany({
      where: {
        campaignId,
        status: "queued",
        generatedEmail: { not: null },
        generatedSubject: { not: null },
      },
      take: actualBatch,
      select: {
        id: true,
        generatedEmail: true,
        generatedSubject: true,
        prospect: {
          select: { id: true, email: true, unsubscribed: true },
        },
      },
    });

    if (leads.length === 0) {
      return NextResponse.json({ sent: 0, message: "No queued leads with generated emails" });
    }

    // Decrypt sender password
    let senderPassword: string;
    try {
      senderPassword = decrypt(campaign.senderPassword);
    } catch {
      return NextResponse.json({ error: "Failed to decrypt sender credentials" }, { status: 500 });
    }

    const sequenceId = campaign.sequences[0]?.id;
    if (!sequenceId) {
      return NextResponse.json({ error: "No email sequence configured" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
      // Skip unsubscribed
      if (lead.prospect.unsubscribed) {
        await prisma.campaignLead.update({
          where: { id: lead.id },
          data: { status: "unsubscribed" },
        });
        continue;
      }

      const unsubscribeUrl = buildUnsubscribeUrl(lead.prospect.id);

      const result = await sendColdEmail({
        to: lead.prospect.email,
        subject: lead.generatedSubject!,
        body: lead.generatedEmail!,
        senderName: campaign.senderName,
        senderEmail: campaign.senderEmail,
        senderPassword,
        unsubscribeUrl,
      });

      // Create SentEmail record
      await prisma.sentEmail.create({
        data: {
          campaignLeadId: lead.id,
          sequenceId,
          subject: lead.generatedSubject!,
          body: lead.generatedEmail!,
          messageId: result.messageId || null,
          status: result.success ? "sent" : "bounced",
          errorMessage: result.error || null,
        },
      });

      // Update lead status
      await prisma.campaignLead.update({
        where: { id: lead.id },
        data: {
          status: result.success ? "sent" : "bounced",
          currentStep: 1,
        },
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Random delay between sends (30-90 seconds)
      if (leads.indexOf(lead) < leads.length - 1) {
        const delay = 30000 + Math.random() * 60000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    // Update campaign counters
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        emailsSent: { increment: sent },
        bounces: { increment: failed },
      },
    });

    return NextResponse.json({
      sent,
      failed,
      remaining: remaining - sent - failed,
      dailyLimit: campaign.dailyLimit,
      sentToday: sentToday + sent,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/email/send error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
