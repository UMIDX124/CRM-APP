/**
 * Groq AI cold email generator using PAS framework.
 * Generates personalized, conversational outreach emails.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const DEFAULT_SYSTEM_PROMPT = `You are a friendly digital marketing consultant who helps local service businesses get more customers. 8 years experience. You genuinely care about small business owners.

STRICT RULES:
- Use PAS framework (Problem-Agitate-Solution)
- Under 100 words total. Max 6 sentences.
- Casual, conversational. Contractions required.
- Vary sentence length dramatically (3 words to 20 words)
- Never use: 'I hope this finds you well', 'leverage', 'synergy', 'cutting-edge', 'in today\'s competitive landscape', 'touch base', 'just checking in', 'circle back'
- Open with observation about THEIR business, not about you
- One specific detail about their niche/city
- CTA: single low-friction question, never ask for a meeting
- One sentence fragment or conversational aside
- Sound like a real person who spent 3 minutes writing this
- No HTML formatting. Plain text only.
- First name only in greeting (Hi {name},). No "Dear".

OUTPUT FORMAT (JSON only, no markdown, no code fences):
{"subject": "subject line 3-5 words lowercase", "body": "email body here", "subjectVariants": ["variant 2", "variant 3"]}`;

export interface ProspectInput {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  niche?: string | null;
  city?: string | null;
  country?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  website?: string | null;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  subjectVariants: string[];
}

export async function generateEmail(
  prospect: ProspectInput,
  customSystemPrompt?: string | null
): Promise<GeneratedEmail> {
  const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  const prospectContext = [
    prospect.firstName ? `First name: ${prospect.firstName}` : null,
    prospect.company ? `Business: ${prospect.company}` : null,
    prospect.niche ? `Industry/Niche: ${prospect.niche}` : null,
    prospect.city ? `City: ${prospect.city}` : null,
    prospect.country ? `Country: ${prospect.country}` : null,
    prospect.googleRating ? `Google rating: ${prospect.googleRating}/5` : null,
    prospect.reviewCount ? `Review count: ${prospect.reviewCount}` : null,
    prospect.website ? `Website: ${prospect.website}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await generateText({
    model: groq(MODEL),
    system: systemPrompt,
    prompt: `Write a cold outreach email for this prospect:\n\n${prospectContext}\n\nRemember: JSON output only, no markdown.`,
    maxOutputTokens: 400,
    temperature: 0.8,
  });

  try {
    // Strip any markdown code fences if the model adds them
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      subject: parsed.subject || "quick question",
      body: parsed.body || "",
      subjectVariants: Array.isArray(parsed.subjectVariants) ? parsed.subjectVariants : [],
    };
  } catch {
    // If JSON parsing fails, use the raw text as the body
    return {
      subject: "quick question",
      body: text.trim(),
      subjectVariants: [],
    };
  }
}

export async function generateBatch(
  prospects: ProspectInput[],
  customSystemPrompt?: string | null,
  concurrency: number = 3
): Promise<GeneratedEmail[]> {
  const results: GeneratedEmail[] = [];
  const queue = [...prospects];

  async function worker() {
    while (queue.length > 0) {
      const prospect = queue.shift();
      if (!prospect) break;
      try {
        const email = await generateEmail(prospect, customSystemPrompt);
        results.push(email);
      } catch (err) {
        console.error("Email generation failed for prospect:", prospect.company, err);
        results.push({
          subject: "quick question",
          body: "",
          subjectVariants: [],
        });
      }
      // Small delay to respect Groq rate limits
      if (queue.length > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, prospects.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
