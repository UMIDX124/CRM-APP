import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMagicLink } from "@/lib/portal-auth";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("portal-login", req, { limit: 5, windowSec: 300 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, portalAccess: true },
      select: { id: true, companyName: true, contactName: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!client) {
      return NextResponse.json({ ok: true, message: "If your email is registered, you will receive a login link." });
    }

    const token = await createMagicLink(client.id);
    const baseUrl = process.env.APP_URL || "https://alpha-command-center.vercel.app";
    const loginUrl = `${baseUrl}/portal/verify?token=${token}`;

    // Send magic link via Resend (existing email system)
    try {
      const { sendEmail: resendEmail } = await import("@/lib/email");
      await resendEmail({
        to: client.email,
        subject: "Your Portal Login Link",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#F59E0B;margin-bottom:16px;">Portal Access</h2>
            <p>Hi ${client.contactName},</p>
            <p>Click the link below to access your client portal:</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#F59E0B;color:#0A0A0F;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
              Login to Portal
            </a>
            <p style="color:#888;font-size:13px;margin-top:16px;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[portal/login] Failed to send magic link email:", emailErr);
    }

    return NextResponse.json({ ok: true, message: "If your email is registered, you will receive a login link." });
  } catch (error) {
    console.error("[portal/login]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
