/**
 * Multi-stage email verification:
 * 1. Syntax check
 * 2. Disposable domain check
 * 3. MX record lookup
 * 4. SMTP handshake (graceful degradation on serverless)
 */

import dns from "dns/promises";
import net from "net";

export interface VerifyResult {
  email: string;
  status: "valid" | "invalid" | "risky" | "disposable";
  mxFound: boolean;
  smtpCode: number | null;
  reason: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.de", "10minutemail.com",
  "tempmail.com", "throwaway.email", "yopmail.com", "sharklasers.com",
  "trashmail.com", "trashmail.me", "trashmail.net", "getnada.com",
  "maildrop.cc", "dispostable.com", "fakeinbox.com", "mailnesia.com",
  "tempail.com", "tempr.email", "discard.email", "discardmail.com",
  "mailcatch.com", "mintemail.com", "temp-mail.org", "tempmailo.com",
  "mohmal.com", "burnermail.io", "grr.la", "guerrillamail.info",
  "harakirimail.com", "jetable.org", "mailexpire.com", "mailforspam.com",
  "mailnull.com", "mailscrap.com", "mailzilla.com", "nomail.xl.cx",
  "nospam.ze.tc", "owlpic.com", "proxymail.eu", "rcpt.at",
  "reallymymail.com", "rtrtr.com", "spambox.us", "spamcowboy.com",
  "spameveryoneithinkishould.email", "spamfree24.org", "spamgourmet.com",
  "spamhole.com", "spaml.com", "spammotel.com", "tempinbox.com",
  "tempomail.fr", "tmpmail.net", "tmpmail.org", "trash-mail.at",
  "trashmail.at", "trbvm.com", "wegwerfmail.de", "wegwerfmail.net",
  "wh4f.org", "yopmail.fr", "yopmail.net", "zehnminutenmail.de",
  "mytemp.email", "emailondeck.com", "mailnator.com", "crazymailing.com",
]);

function checkSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function checkDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

async function checkMx(email: string): Promise<{ found: boolean; host: string | null }> {
  const domain = email.split("@")[1];
  if (!domain) return { found: false, host: null };

  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return { found: false, host: null };
    records.sort((a, b) => a.priority - b.priority);
    return { found: true, host: records[0].exchange };
  } catch {
    return { found: false, host: null };
  }
}

async function checkSmtp(email: string, mxHost: string): Promise<{ code: number | null; valid: boolean | null }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ code: null, valid: null });
    }, 5000);

    const socket = net.createConnection(25, mxHost);
    let step = 0;
    let responseCode: number | null = null;

    socket.setEncoding("utf8");

    socket.on("data", (data: string) => {
      const code = parseInt(data.substring(0, 3), 10);

      if (step === 0) {
        // Server greeting
        socket.write(`EHLO verify.local\r\n`);
        step = 1;
      } else if (step === 1) {
        // EHLO response
        if (code === 250) {
          socket.write(`MAIL FROM:<verify@check.local>\r\n`);
          step = 2;
        } else {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ code, valid: null });
        }
      } else if (step === 2) {
        // MAIL FROM response
        if (code === 250) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step = 3;
        } else {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ code, valid: null });
        }
      } else if (step === 3) {
        // RCPT TO response — the key check
        responseCode = code;
        socket.write("QUIT\r\n");
        clearTimeout(timeout);
        socket.destroy();

        if (code === 250) {
          resolve({ code, valid: true });
        } else if (code === 550 || code === 551 || code === 553 || code === 554) {
          resolve({ code, valid: false });
        } else {
          resolve({ code, valid: null });
        }
      }
    });

    socket.on("error", () => {
      clearTimeout(timeout);
      resolve({ code: null, valid: null });
    });

    socket.on("timeout", () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ code: null, valid: null });
    });
  });
}

export async function verifyEmail(email: string): Promise<VerifyResult> {
  const normalized = email.trim().toLowerCase();

  // Step 1: Syntax
  if (!checkSyntax(normalized)) {
    return { email: normalized, status: "invalid", mxFound: false, smtpCode: null, reason: "Invalid email syntax" };
  }

  // Step 2: Disposable
  if (checkDisposable(normalized)) {
    return { email: normalized, status: "disposable", mxFound: false, smtpCode: null, reason: "Disposable email domain" };
  }

  // Step 3: MX records
  const mx = await checkMx(normalized);
  if (!mx.found || !mx.host) {
    return { email: normalized, status: "invalid", mxFound: false, smtpCode: null, reason: "No MX records found" };
  }

  // Step 4: SMTP handshake (best effort — fails gracefully on Vercel)
  try {
    const smtp = await checkSmtp(normalized, mx.host);
    if (smtp.valid === true) {
      return { email: normalized, status: "valid", mxFound: true, smtpCode: smtp.code, reason: "SMTP verified" };
    }
    if (smtp.valid === false) {
      return { email: normalized, status: "invalid", mxFound: true, smtpCode: smtp.code, reason: "SMTP rejected recipient" };
    }
    // SMTP inconclusive — MX exists so mark as risky (likely valid)
    return { email: normalized, status: "risky", mxFound: true, smtpCode: smtp.code, reason: "SMTP inconclusive, MX exists" };
  } catch {
    // SMTP failed entirely (e.g., port 25 blocked on Vercel) — rely on MX check
    return { email: normalized, status: "risky", mxFound: true, smtpCode: null, reason: "SMTP unavailable, MX exists" };
  }
}

export async function verifyBatch(
  emails: string[],
  concurrency: number = 5
): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  const queue = [...emails];

  async function worker() {
    while (queue.length > 0) {
      const email = queue.shift();
      if (!email) break;
      const result = await verifyEmail(email);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, emails.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
