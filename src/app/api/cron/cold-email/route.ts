import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { sendColdEmail } from "@/lib/cold-email/sender";
import { buildUnsubscribeUrl } from "@/lib/cold-email/unsubscribe";

export const maxDuration = 300;

// Vercel Cron: runs every 30 minutes to send queued cold emails
// Schedule: */30 * * * *

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const todayName = dayNames[now.getUTCDay()];
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Find all active campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      where: { status: "active" },
      select: {
        id: true,
        senderName: true,
        senderEmail: true,
        senderPassword: true,
        dailyLimit: true,
        sendingDays: true,
        sendingHours: true,
        sequences: {
          orderBy: { stepNumber: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    let totalSent = 0;
    let totalFailed = 0;
    const campaignResults: Array<{ id: string; sent: number; failed: number }> = [];

    for (const campaign of campaigns) {
      // Check if today is a sending day
      const allowedDays = campaign.sendingDays.toLowerCase().split(",").map((d) => d.trim());
      if (!allowedDays.includes(todayName)) continue;

      // Check sending hours
      try {
        const [startStr, endStr] = campaign.sendingHours.split("-");
        const [startH] = startStr.split(":").map(Number);
        const [endH] = endStr.split(":").map(Number);
        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startH * 60;
        const endMinutes = endH * 60;
        if (currentMinutes < startMinutes || currentMinutes >= endMinutes) continue;
      } catch {
        // If parsing fails, skip this campaign
        continue;
      }

      // Check daily limit
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const sentToday = await prisma.sentEmail.count({
        where: {
          campaignLead: { campaignId: campaign.id },
          sentAt: { gte: todayStart },
        },
      });

      const remaining = Math.max(0, campaign.dailyLimit - sentToday);
      if (remaining === 0) continue;

      // Send a fraction of daily limit per cron run (spread across 8 runs in sending window)
      const batchSize = Math.max(1, Math.ceil(campaign.dailyLimit / 8));
      const actualBatch = Math.min(batchSize, remaining);

      const sequenceId = campaign.sequences[0]?.id;
      if (!sequenceId) continue;

      // Fetch queued leads
      const leads = await prisma.campaignLead.findMany({
        where: {
          campaignId: campaign.id,
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

      if (leads.length === 0) continue;

      // Decrypt password once per campaign
      let senderPassword: string;
      try {
        senderPassword = decrypt(campaign.senderPassword);
      } catch {
        console.error(`Cron: Failed to decrypt password for campaign ${campaign.id}`);
        continue;
      }

      let sent = 0;
      let failed = 0;

      for (const lead of leads) {
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

        await prisma.campaignLead.update({
          where: { id: lead.id },
          data: {
            status: result.success ? "sent" : "bounced",
            currentStep: 1,
          },
        });

        if (result.success) sent++;
        else failed++;

        // Delay between sends
        if (leads.indexOf(lead) < leads.length - 1) {
          const delay = 30000 + Math.random() * 60000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      // Update campaign counters
      if (sent > 0 || failed > 0) {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            emailsSent: { increment: sent },
            bounces: { increment: failed },
          },
        });
      }

      totalSent += sent;
      totalFailed += failed;
      campaignResults.push({ id: campaign.id, sent, failed });
    }

    return NextResponse.json({
      processed: campaigns.length,
      totalSent,
      totalFailed,
      campaigns: campaignResults,
    });
  } catch (err) {
    console.error("Cold email cron error:", err);
    return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
  }
}
