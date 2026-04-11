/**
 * Fetch-based business website scraper.
 * Crawls websites to extract email addresses.
 * No Playwright — works on Vercel serverless.
 */

export interface ScrapedProspect {
  email: string;
  firstName?: string;
  company?: string;
  website?: string;
  phone?: string;
  niche?: string;
  city?: string;
  country?: string;
  source: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORED_EMAILS = new Set([
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "webmaster", "hostmaster",
  "abuse", "support@wix.com", "support@squarespace.com",
  "example@example.com", "email@example.com", "your@email.com",
  "info@wix.com", "info@wordpress.com",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
  ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
]);

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function filterEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const localPart = lower.split("@")[0];

  // Check ignored local parts
  if (IGNORED_EMAILS.has(localPart) || IGNORED_EMAILS.has(lower)) return false;

  // Check file extensions (image filenames mistakenly captured)
  for (const ext of IGNORED_EXTENSIONS) {
    if (lower.endsWith(ext)) return false;
  }

  // Filter out very long emails (probably not real)
  if (email.length > 80) return false;

  // Filter out emails that look like encoded strings
  if (email.includes("%") || email.includes("=")) return false;

  return true;
}

function rankEmail(email: string): number {
  const local = email.split("@")[0].toLowerCase();
  // Prefer personal/owner emails over generic ones
  if (local.includes("owner") || local.includes("ceo") || local.includes("founder")) return 100;
  if (local.includes("contact")) return 80;
  if (local.includes("hello")) return 70;
  if (local.includes("admin")) return 50;
  if (local.includes("info")) return 40;
  if (local.includes("office")) return 35;
  if (local.includes("sales")) return 30;
  if (local.includes("support")) return 10;
  return 60; // personal emails (john@, etc.) rank fairly high
}

async function fetchPage(url: string, timeoutMs: number = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": randomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!resp.ok) return "";
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return "";

    const text = await resp.text();
    // Limit to first 500KB to avoid memory issues
    return text.substring(0, 500_000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function extractEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || [];
  const unique = [...new Set(matches.map((e) => e.toLowerCase()))];
  return unique.filter(filterEmail);
}

function extractPhoneNumbers(html: string): string[] {
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = html.match(phoneRegex) || [];
  return [...new Set(matches)].slice(0, 3);
}

function pickBestEmail(emails: string[]): string | null {
  if (emails.length === 0) return null;
  const sorted = emails.sort((a, b) => rankEmail(b) - rankEmail(a));
  return sorted[0];
}

export interface ScrapeWebsiteResult {
  emails: string[];
  bestEmail: string | null;
  phone: string | null;
}

export async function scrapeWebsite(websiteUrl: string): Promise<ScrapeWebsiteResult> {
  let baseUrl = websiteUrl;
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }
  // Normalize trailing slash
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const pagesToCheck = [
    baseUrl,
    `${baseUrl}contact`,
    `${baseUrl}contact-us`,
    `${baseUrl}about`,
    `${baseUrl}about-us`,
  ];

  const allEmails: string[] = [];
  let phone: string | null = null;

  for (const pageUrl of pagesToCheck) {
    try {
      const html = await fetchPage(pageUrl);
      if (!html) continue;

      const emails = extractEmails(html);
      allEmails.push(...emails);

      if (!phone) {
        const phones = extractPhoneNumbers(html);
        if (phones.length > 0) phone = phones[0];
      }
    } catch {
      // Skip failed pages
    }

    // Small delay between requests to the same domain
    await new Promise((r) => setTimeout(r, 300));
  }

  const uniqueEmails = [...new Set(allEmails)];
  return {
    emails: uniqueEmails,
    bestEmail: pickBestEmail(uniqueEmails),
    phone,
  };
}

export interface ScraperInput {
  websites: Array<{
    url: string;
    businessName?: string;
    niche?: string;
    city?: string;
    country?: string;
  }>;
}

export async function scrapeBusinessWebsites(input: ScraperInput): Promise<ScrapedProspect[]> {
  const prospects: ScrapedProspect[] = [];
  const seenEmails = new Set<string>();

  for (const site of input.websites) {
    if (!site.url) continue;

    try {
      const result = await scrapeWebsite(site.url);

      if (result.bestEmail && !seenEmails.has(result.bestEmail)) {
        seenEmails.add(result.bestEmail);

        // Try to extract first name from email
        const local = result.bestEmail.split("@")[0];
        let firstName: string | undefined;
        if (local && !["info", "contact", "hello", "admin", "office", "sales", "support"].includes(local)) {
          const namePart = local.split(/[._-]/)[0];
          if (namePart && namePart.length >= 2 && namePart.length <= 20) {
            firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          }
        }

        prospects.push({
          email: result.bestEmail,
          firstName,
          company: site.businessName,
          website: site.url,
          phone: result.phone || undefined,
          niche: site.niche,
          city: site.city,
          country: site.country,
          source: "google_maps",
        });
      }
    } catch (err) {
      console.error(`Scraper error for ${site.url}:`, err);
    }

    // Random delay between different websites
    const delay = 800 + Math.random() * 1200;
    await new Promise((r) => setTimeout(r, delay));
  }

  return prospects;
}
