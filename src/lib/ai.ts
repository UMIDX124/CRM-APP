/**
 * Shared Groq AI helper for the /api/ai/* feature routes.
 *
 * - Wraps `generateText` with exponential-backoff retry (3 attempts).
 * - Reads the model id from GROQ_MODEL (defaults to llama-3.3-70b-versatile).
 * - Returns typed { text } payloads so callers don't have to care about
 *   provider internals.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

export const AI_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Lazily construct the provider — `createGroq` reads the env at call time so
// we don't throw at import if the key isn't wired up during a build.
function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err: Error & { code?: string } = new Error(
      "GROQ_API_KEY is not configured. AI features are disabled."
    );
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }
  return createGroq({ apiKey });
}

export interface GenerateOptions {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  attempts: number;
}

const RETRIABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function isRetriable(err: unknown): boolean {
  if (!err || typeof err !== "object") return true;
  const maybe = err as { status?: number; statusCode?: number; name?: string };
  const status = maybe.status ?? maybe.statusCode;
  if (typeof status === "number") return RETRIABLE_STATUS.has(status);
  // Network/abort/fetch-style errors — always retriable
  if (maybe.name === "AbortError" || maybe.name === "TypeError") return true;
  return true;
}

/**
 * Call Groq with up to 3 attempts. Each attempt uses exponential backoff
 * (250ms → 750ms → 2250ms) with a little jitter.
 */
export async function aiGenerate(opts: GenerateOptions): Promise<GenerateResult> {
  const groq = getGroq();
  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { text } = await generateText({
        model: groq(AI_MODEL),
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.7,
      });
      return { text, model: AI_MODEL, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetriable(err)) break;
      const base = 250 * 3 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 120);
      await new Promise((r) => setTimeout(r, base + jitter));
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : "AI request failed";
  const wrapped = new Error(`AI generation failed after ${maxAttempts} attempts: ${message}`);
  (wrapped as Error & { cause?: unknown }).cause = lastErr;
  throw wrapped;
}

/**
 * Parse the first JSON object out of an LLM response. Groq sometimes wraps
 * JSON in markdown fences or prepends commentary; this strips both.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Grab the first { … } or [ … ] substring
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
