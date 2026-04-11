import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/cold-email/unsubscribe";
import { rateLimit } from "@/lib/ratelimit";

// GET — public unsubscribe endpoint (no auth — clicked by email recipients)
export async function GET(req: Request) {
  const rl = await rateLimit("unsubscribe", req, { limit: 20, windowSec: 60 });
  if (!rl.success) {
    return new Response("Too many requests. Please try again later.", {
      status: 429,
      headers: { "Content-Type": "text/html" },
    });
  }

  const url = new URL(req.url);
  const prospectId = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!prospectId || !token) {
    return new Response(unsubscribePage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verify HMAC token
  try {
    const valid = verifyUnsubscribeToken(prospectId, token);
    if (!valid) {
      return new Response(unsubscribePage("Invalid unsubscribe link."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
  } catch {
    return new Response(unsubscribePage("Something went wrong. Please try again."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Mark prospect as unsubscribed
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    });

    // Update all their campaign lead statuses
    await prisma.campaignLead.updateMany({
      where: { prospectId },
      data: { status: "unsubscribed" },
    });

    // Increment unsubscribe counters on affected campaigns
    const affectedCampaigns = await prisma.campaignLead.findMany({
      where: { prospectId },
      select: { campaignId: true },
      distinct: ["campaignId"],
    });

    for (const cl of affectedCampaigns) {
      await prisma.emailCampaign.update({
        where: { id: cl.campaignId },
        data: { unsubscribes: { increment: 1 } },
      });
    }

    return new Response(unsubscribePage("You've been successfully unsubscribed. You will no longer receive emails from us."), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new Response(unsubscribePage("Something went wrong. Please try again or reply STOP to the email."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function unsubscribePage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #e5e5e5;
    }
    .card {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 480px;
      border: 1px solid #262626;
      border-radius: 12px;
      background: #141414;
    }
    h1 { font-size: 1.25rem; margin-bottom: 1rem; color: #f5f5f5; }
    p { font-size: 0.95rem; line-height: 1.6; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email Preferences</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
