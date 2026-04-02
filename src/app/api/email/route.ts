import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "to, subject, body required" }, { status: 400 });
    }

    // Use Resend if API key available, otherwise mock
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: "FU Corp CRM <crm@fu-corp.com>",
        to: [to],
        subject,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #FF6B00; padding: 20px; text-align: center;">
            <h1 style="color: #000; margin: 0; font-size: 24px;">FU Corp</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            ${body.replace(/\n/g, "<br>")}
          </div>
          <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
            Sent from FU Corp Command Center
          </div>
        </div>`,
      });

      await logAudit({
        action: "CREATE", entity: "Email", entityId: to, userId: user.id,
        metadata: { to, subject },
      });

      return NextResponse.json({ success: true, id: result.data?.id });
    }

    // Mock response when no Resend key
    await logAudit({
      action: "CREATE", entity: "Email", entityId: to, userId: user.id,
      metadata: { to, subject, mock: true },
    });

    return NextResponse.json({ success: true, mock: true, message: "Email logged (no RESEND_API_KEY)" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
