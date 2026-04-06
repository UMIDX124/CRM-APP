import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/*
 * WEBHOOK: Auto Lead Capture from Website Forms
 *
 * Accepts leads from DPL, VCS, BSL website forms.
 * Enhanced with: formType, qualityScore, UTM attribution, auto-assignment
 * Returns leadId for tracking.
 */

// Enhanced lead scoring with more granular components
function scoreLead(data: {
  budget?: string;
  service?: string;
  company?: string;
  email?: string;
  formType?: string;
  qualityScore?: number;
  utmSource?: string;
}): { priority: string; score: number } {
  let score = 0;

  // Budget signal (0-40 pts)
  const budget = parseInt(data.budget || "0");
  if (budget >= 20000) score += 40;
  else if (budget >= 10000) score += 30;
  else if (budget >= 5000) score += 20;
  else if (budget >= 1000) score += 10;

  // Contact quality (0-20 pts)
  if (data.email && !data.email.match(/@(gmail|yahoo|hotmail|outlook|aol|icloud)\./i)) score += 10;
  if (data.company && data.company.length > 2) score += 10;

  // Engagement signal based on form type (0-20 pts)
  const formType = (data.formType || "").toLowerCase();
  if (formType === "chatbot" || formType === "chat") score += 20;
  else if (formType === "audit") score += 15;
  else if (formType === "contact" || formType === "founder") score += 10;
  else if (formType === "newsletter") score += 5;
  else score += 10; // default for unknown forms

  // Service match (0-10 pts)
  const service = (data.service || "").toLowerCase();
  if (service.includes("marketing") || service.includes("ads") || service.includes("seo")) score += 10;
  else if (service.includes("development") || service.includes("app") || service.includes("ai")) score += 10;
  else if (service.includes("security") || service.includes("backup")) score += 7;
  else if (service) score += 5;

  // Attribution (0-10 pts)
  const utm = (data.utmSource || "").toLowerCase();
  if (utm === "referral") score += 10;
  else if (utm === "organic" || utm === "google") score += 7;
  else if (utm === "paid" || utm === "facebook" || utm === "meta") score += 5;
  else score += 3; // direct

  // If the website already scored the lead (e.g., DPL chatbot), blend scores
  if (data.qualityScore && data.qualityScore > 0) {
    score = Math.round((score + data.qualityScore) / 2);
  }

  score = Math.min(score, 100);

  // Priority mapping
  let priority = "LOW";
  if (score >= 80) priority = "URGENT";
  else if (score >= 60) priority = "HIGH";
  else if (score >= 40) priority = "MEDIUM";

  return { priority, score };
}

// Map source to brand ID
function getBrandId(source: string): string | null {
  const map: Record<string, string> = { VCS: "b1", BSL: "b2", DPL: "b3" };
  return map[source?.toUpperCase()] || null;
}

// Auto-assign lead based on source and priority
function autoAssignRep(source: string, priority: string): string | null {
  // URGENT leads go to founders
  if (priority === "URGENT") {
    return Math.random() > 0.5 ? "faizan" : "umer";
  }

  // By brand expertise
  const assignments: Record<string, string[]> = {
    DPL: ["faizan", "umer"],  // Performance marketing
    VCS: ["ahmed", "ali"],     // SEO/workforce
    BSL: ["hamza", "sarah"],   // Tech/security
  };

  const team = assignments[source?.toUpperCase()] || ["faizan", "umer"];
  return team[Math.floor(Math.random() * team.length)];
}

export async function POST(req: Request) {
  try {
    let data: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("form")) {
      const formData = await req.formData();
      formData.forEach((val, key) => { data[key] = String(val); });
    } else {
      try {
        data = await req.json();
      } catch {
        const formData = await req.formData();
        formData.forEach((val, key) => { data[key] = String(val); });
      }
    }

    const {
      name, email, phone, company, service, budget, message, source,
      formType, qualityScore: qsRaw, utmSource, utmMedium, utmCampaign,
    } = data;

    if (!name && !email) {
      return NextResponse.json({ error: "Name or email required" }, { status: 400 });
    }

    // Score the lead
    const qualityScore = parseInt(qsRaw || "0") || 0;
    const { priority, score } = scoreLead({ budget, service, company, email, formType, qualityScore, utmSource });
    const brandId = getBrandId(source || "");
    const assignedRep = autoAssignRep(source || "", priority);

    // Build source string with form type
    const sourceLabel = formType
      ? `${formType.charAt(0).toUpperCase() + formType.slice(1)} - ${source || "Direct"}`
      : `Website - ${source || "Direct"}`;

    // Build notes with attribution and metadata
    const notesParts = [];
    if (message) notesParts.push(message);
    if (formType) notesParts.push(`Form: ${formType}`);
    if (utmSource) notesParts.push(`UTM: ${utmSource}/${utmMedium || "-"}/${utmCampaign || "-"}`);
    if (assignedRep) notesParts.push(`Auto-assigned: ${assignedRep}`);
    notesParts.push(`Score: ${score}/100 (${priority})`);
    const notes = notesParts.join(" | ");

    // Create lead in database
    let leadId: string | null = null;
    try {
      const lead = await prisma.lead.create({
        data: {
          companyName: company || name || "Unknown",
          contactName: name || "Unknown",
          email: email || "",
          phone: phone || null,
          country: null,
          services: service ? service.split(",").map((s: string) => s.trim()) : [],
          source: sourceLabel,
          status: "NEW",
          value: parseInt(budget || "0") || 0,
          probability: score,
          brandId,
          notes,
        },
      });
      leadId = lead.id;
    } catch (dbErr) {
      console.error("Webhook DB error:", dbErr);
    }

    // Create notification for assigned rep (if DB is connected)
    if (leadId) {
      try {
        // Find the assigned user
        const assigneeEmail = assignedRep ? `${assignedRep}@digitalpointllc.com` : null;
        if (assigneeEmail) {
          const user = await prisma.user.findUnique({ where: { email: assigneeEmail }, select: { id: true } });
          if (user) {
            await prisma.notification.create({
              data: {
                title: `New ${priority} Lead`,
                message: `${company || name} via ${source || "Direct"} (Score: ${score}/100)`,
                type: "lead",
                userId: user.id,
                data: { leadId, priority, score, source: source || "Direct", formType: formType || "website" },
              },
            });
          }
        }
      } catch {
        // Notification creation failed — not critical
      }
    }

    // Send notification email (if Resend configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Alpha CRM <crm@fu-corp.com>",
          to: ["faizi@digitalpointllc.com", "umi@digitalpointllc.com"],
          subject: `New Lead: ${company || name} (${priority} - Score ${score})`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#6366F1;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:18px;">New Lead Captured</h1>
              </div>
              <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Name</td><td style="padding:8px 0;font-weight:600;font-size:13px;">${name || "—"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:8px 0;font-size:13px;">${email || "—"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Phone</td><td style="padding:8px 0;font-size:13px;">${phone || "—"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Company</td><td style="padding:8px 0;font-size:13px;">${company || "—"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Service</td><td style="padding:8px 0;font-size:13px;">${service || "—"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Budget</td><td style="padding:8px 0;font-size:13px;">$${budget || "0"}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Source</td><td style="padding:8px 0;font-size:13px;">${sourceLabel}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Priority</td><td style="padding:8px 0;font-weight:700;font-size:13px;color:${priority === "URGENT" ? "#EF4444" : priority === "HIGH" ? "#F59E0B" : "#3B82F6"};">${priority} (Score: ${score}/100)</td></tr>
                  ${assignedRep ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Assigned</td><td style="padding:8px 0;font-size:13px;">${assignedRep}</td></tr>` : ""}
                </table>
                ${message ? `<div style="margin-top:16px;padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#374151;">${message}</div>` : ""}
                <div style="margin-top:16px;text-align:center;">
                  <a href="https://fu-corp-crm.vercel.app/pipeline" style="display:inline-block;padding:10px 24px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">View in CRM</a>
                </div>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Webhook email error:", emailErr);
      }
    }

    // Google Sheets sync
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      try {
        await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, email, phone, company, service, budget, message,
            source: source || "Direct", formType: formType || "website",
            priority, score, assignedRep,
            utmSource, utmMedium, utmCampaign,
            date: new Date().toISOString(),
          }),
        });
      } catch {
        // Sheet sync failed — not critical
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lead captured successfully",
        leadId,
        lead: { company: company || name, priority, score, assignedRep },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process lead" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// GET — info page
export async function GET() {
  return new Response(
    `<!DOCTYPE html>
    <html><head><title>Alpha CRM Webhook</title></head>
    <body style="font-family:system-ui;background:#0A0A0F;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="text-align:center;max-width:500px;padding:40px;">
        <div style="width:60px;height:60px;background:#6366F1;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-weight:900;font-size:20px;color:#fff;">A</div>
        <h1 style="font-size:24px;margin:0 0 8px;">Webhook Active</h1>
        <p style="color:#71717A;font-size:14px;margin:0 0 24px;">This endpoint receives form submissions and creates leads in Alpha CRM.</p>
        <div style="background:#131318;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:left;font-size:13px;">
          <p style="color:#6366F1;margin:0 0 8px;font-weight:600;">Fields:</p>
          <code style="color:#71717A;">name, email, phone, company, service, budget, message, source, formType, qualityScore, utmSource, utmMedium, utmCampaign</code>
        </div>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

// CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
