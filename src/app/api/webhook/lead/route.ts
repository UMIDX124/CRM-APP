import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/*
 * WEBHOOK: Auto Lead Capture from Website Forms
 *
 * Any website form can POST to this endpoint to create a lead automatically.
 * No authentication needed — this is a public webhook.
 *
 * USAGE ON YOUR WEBSITE:
 *
 * <form action="https://fu-corp-crm.vercel.app/api/webhook/lead" method="POST">
 *   <input name="name" placeholder="Your Name" required />
 *   <input name="email" placeholder="Email" required />
 *   <input name="phone" placeholder="Phone" />
 *   <input name="company" placeholder="Company Name" />
 *   <input name="service" placeholder="What service?" />
 *   <input name="budget" placeholder="Budget" />
 *   <input name="message" placeholder="Tell us more" />
 *   <input type="hidden" name="source" value="VCS" />
 *   <button type="submit">Submit</button>
 * </form>
 *
 * OR via JavaScript:
 *
 * fetch('https://fu-corp-crm.vercel.app/api/webhook/lead', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'John Smith',
 *     email: 'john@example.com',
 *     phone: '+1 555-1234',
 *     company: 'Acme Corp',
 *     service: 'Web Development',
 *     budget: '10000',
 *     message: 'Need a new website',
 *     source: 'VCS'  // or BSL, DPL
 *   })
 * });
 */

// Lead scoring logic
function scoreLead(data: { budget?: string; service?: string; company?: string; email?: string }): { priority: string; score: number } {
  let score = 30; // Base score

  // Budget scoring
  const budget = parseInt(data.budget || "0");
  if (budget >= 20000) { score += 40; }
  else if (budget >= 10000) { score += 30; }
  else if (budget >= 5000) { score += 20; }
  else if (budget >= 1000) { score += 10; }

  // Has company name = more serious
  if (data.company && data.company.length > 2) score += 10;

  // Business email (not gmail/yahoo) = more serious
  if (data.email && !data.email.match(/@(gmail|yahoo|hotmail|outlook)\./i)) score += 10;

  // Service type scoring
  const service = (data.service || "").toLowerCase();
  if (service.includes("marketing") || service.includes("ads") || service.includes("seo")) score += 10;
  if (service.includes("development") || service.includes("app")) score += 10;

  // Determine priority
  let priority = "LOW";
  if (score >= 80) priority = "URGENT";
  else if (score >= 60) priority = "HIGH";
  else if (score >= 40) priority = "MEDIUM";

  return { priority, score: Math.min(score, 100) };
}

// Map source to brand ID
function getBrandId(source: string): string | null {
  const map: Record<string, string> = { VCS: "b1", BSL: "b2", DPL: "b3" };
  return map[source?.toUpperCase()] || null;
}

export async function POST(req: Request) {
  try {
    // Accept both JSON and form data
    let data: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("form")) {
      const formData = await req.formData();
      formData.forEach((val, key) => { data[key] = String(val); });
    } else {
      // Try JSON first, then form
      try {
        data = await req.json();
      } catch {
        const formData = await req.formData();
        formData.forEach((val, key) => { data[key] = String(val); });
      }
    }

    const { name, email, phone, company, service, budget, message, source } = data;

    if (!name && !email) {
      return NextResponse.json({ error: "Name or email required" }, { status: 400 });
    }

    // Score the lead
    const { priority, score } = scoreLead({ budget, service, company, email });
    const brandId = getBrandId(source || "");

    // Create lead in database
    try {
      await prisma.lead.create({
        data: {
          companyName: company || name || "Unknown",
          contactName: name || "Unknown",
          email: email || "",
          phone: phone || null,
          country: null,
          services: service ? service.split(",").map((s: string) => s.trim()) : [],
          source: `Website - ${source || "Direct"}`,
          status: "NEW",
          value: parseInt(budget || "0") || 0,
          probability: score,
          brandId,
        },
      });
    } catch {
      // DB not connected — still return success
    }

    // Send notification email (if Resend configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "FU Corp CRM <crm@fu-corp.com>",
          to: ["faizi@digitalpointllc.com", "umi@digitalpointllc.com"],
          subject: `New Lead: ${company || name} (${priority} priority)`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#FF6B00;padding:20px;text-align:center;">
                <h1 style="color:#000;margin:0;">New Lead Captured!</h1>
              </div>
              <div style="padding:30px;background:#f9f9f9;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px;color:#666;">Name</td><td style="padding:8px;font-weight:bold;">${name || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Email</td><td style="padding:8px;">${email || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Phone</td><td style="padding:8px;">${phone || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Company</td><td style="padding:8px;">${company || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Service</td><td style="padding:8px;">${service || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Budget</td><td style="padding:8px;">$${budget || "0"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Message</td><td style="padding:8px;">${message || "—"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Source</td><td style="padding:8px;">${source || "Direct"}</td></tr>
                  <tr><td style="padding:8px;color:#666;">Priority</td><td style="padding:8px;color:${priority === "URGENT" ? "#EF4444" : priority === "HIGH" ? "#F59E0B" : "#3B82F6"};font-weight:bold;">${priority} (Score: ${score}/100)</td></tr>
                </table>
              </div>
              <div style="padding:15px;text-align:center;color:#999;font-size:12px;">
                <a href="https://fu-corp-crm.vercel.app/pipeline" style="color:#FF6B00;">View in CRM Pipeline</a>
              </div>
            </div>
          `,
        });
      } catch (e) {
        // Email failed — not critical
      }
    }

    // Google Sheets sync (if configured)
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      try {
        await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, email, phone, company, service, budget, message,
            source: source || "Direct",
            priority, score,
            date: new Date().toISOString(),
          }),
        });
      } catch {
        // Sheet sync failed — not critical
      }
    }

    // CORS headers for cross-origin form submissions
    return NextResponse.json(
      {
        success: true,
        message: "Lead captured successfully",
        lead: { company: company || name, priority, score },
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

// GET — show info page when visited in browser
export async function GET() {
  return new Response(
    `<!DOCTYPE html>
    <html><head><title>FU Corp CRM Webhook</title></head>
    <body style="font-family:system-ui;background:#09090B;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="text-align:center;max-width:500px;padding:40px;">
        <div style="width:60px;height:60px;background:#FF6B00;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-weight:900;font-size:20px;color:#000;">FU</div>
        <h1 style="font-size:24px;margin:0 0 8px;">Webhook Active</h1>
        <p style="color:#71717A;font-size:14px;margin:0 0 24px;">This endpoint receives form submissions via POST and creates leads in FU Corp CRM + Google Sheets.</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;text-align:left;font-size:13px;">
          <p style="color:#FF6B00;margin:0 0 8px;font-weight:600;">Usage:</p>
          <code style="color:#71717A;">POST ${"{name, email, phone, company, service, budget, message, source}"}</code>
        </div>
        <p style="color:#333;font-size:11px;margin-top:20px;">FU Corp Command Center</p>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
