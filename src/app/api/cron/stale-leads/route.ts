import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification, autoPostToChannel, getSystemUserId } from "@/lib/notifications";

// Vercel Cron: runs daily at 11:00 AM PKT (06:00 UTC)
// Flags leads that have been in NEW status for 3+ days without action

const STALE_DAYS = 3;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

    const staleLeads = await prisma.lead.findMany({
      where: {
        status: "NEW",
        createdAt: { lt: staleBefore },
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        value: true,
        source: true,
        createdAt: true,
      },
      take: 20,
    });

    if (staleLeads.length === 0) {
      return NextResponse.json({ ok: true, staleCount: 0 });
    }

    // Notify sales managers
    const salesManagers = await prisma.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "DEPT_HEAD"] },
        department: { in: ["SALES", "LEADERSHIP"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const totalValue = staleLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const leadNames = staleLeads.slice(0, 5).map((l) => l.companyName).join(", ");

    for (const mgr of salesManagers) {
      await createNotification({
        type: "LEAD_STATUS",
        title: `${staleLeads.length} Stale Leads`,
        message: `${staleLeads.length} leads worth $${totalValue.toLocaleString()} have been untouched for ${STALE_DAYS}+ days: ${leadNames}`,
        userId: mgr.id,
        data: { leadIds: staleLeads.map((l) => l.id) },
      });
    }

    // Post to #leads channel
    const systemUser = await getSystemUserId();
    if (systemUser) {
      await autoPostToChannel(
        "leads",
        `⚠️ **${staleLeads.length} leads are going stale** (${STALE_DAYS}+ days in NEW status, $${totalValue.toLocaleString()} total):\n${staleLeads.slice(0, 5).map((l) => `- ${l.companyName} ($${(l.value || 0).toLocaleString()}) — ${l.source || "Direct"}`).join("\n")}`,
        systemUser,
        "SYSTEM"
      );
    }

    return NextResponse.json({ ok: true, staleCount: staleLeads.length, totalValue });
  } catch (err) {
    console.error("[cron/stale-leads]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
