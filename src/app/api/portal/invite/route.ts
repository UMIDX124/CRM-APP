import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createMagicLink } from "@/lib/portal-auth";

export async function POST(req: Request) {
  try {
    await requireAuth();
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, email: true, contactName: true, companyName: true, portalAccess: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Enable portal access if not already enabled
    if (!client.portalAccess) {
      await prisma.client.update({
        where: { id: clientId },
        data: { portalAccess: true },
      });
    }

    // Generate magic link
    const token = await createMagicLink(clientId);
    const baseUrl = process.env.APP_URL || "https://fu-corp-crm.vercel.app";
    const loginUrl = `${baseUrl}/portal/verify?token=${token}`;

    // Send invite email
    try {
      const { sendEmail: resendEmail } = await import("@/lib/email");
      await resendEmail({
        to: client.email,
        subject: `${client.contactName}, your client portal is ready`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#F59E0B;margin-bottom:16px;">Welcome to Your Client Portal</h2>
            <p>Hi ${client.contactName},</p>
            <p>Your client portal for <strong>${client.companyName}</strong> is now active. You can view your invoices, track project progress, and message our team directly.</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#F59E0B;color:#0A0A0F;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
              Access Your Portal
            </a>
            <p style="color:#888;font-size:13px;margin-top:16px;">This link expires in 30 minutes. You can request a new one anytime from the portal login page.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[portal/invite] Failed to send invite email:", emailErr);
    }

    return NextResponse.json({ ok: true, loginUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("[portal/invite]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
