/**
 * Gmail SMTP sender via nodemailer.
 * Plain text only for best cold email deliverability.
 * CAN-SPAM compliant with unsubscribe header + footer.
 */

import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  senderPassword: string;
  unsubscribeUrl?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const CAN_SPAM_FOOTER = "\n\n---\nDigital Point LLC | Islamabad, Pakistan\nTo stop receiving these emails, reply STOP or click the unsubscribe link below.";

export async function sendColdEmail(options: SendEmailOptions): Promise<SendResult> {
  const { to, subject, body, senderName, senderEmail, senderPassword, unsubscribeUrl } = options;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  const fullBody = unsubscribeUrl
    ? `${body}${CAN_SPAM_FOOTER}\nUnsubscribe: ${unsubscribeUrl}`
    : `${body}${CAN_SPAM_FOOTER}`;

  const headers: Record<string, string> = {
    "Precedence": "bulk",
  };

  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text: fullBody,
      headers,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    console.error(`Failed to send email to ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  } finally {
    transporter.close();
  }
}

export async function sendBatch(
  emails: SendEmailOptions[],
  delayMinMs: number = 30000,
  delayMaxMs: number = 90000
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await sendColdEmail(emails[i]);
    results.push(result);

    // Random delay between sends to mimic human behavior
    if (i < emails.length - 1) {
      const delay = Math.floor(Math.random() * (delayMaxMs - delayMinMs)) + delayMinMs;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return results;
}
