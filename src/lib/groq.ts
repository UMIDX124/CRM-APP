import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_FAST = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MODEL_REASONING = process.env.GROQ_REASONING_MODEL || "llama-3.3-70b-versatile";

export type GroqOptions = {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  reasoning?: boolean;
};

export async function groqText(opts: GroqOptions): Promise<string> {
  const model = opts.reasoning ? MODEL_REASONING : MODEL_FAST;
  const { text } = await generateText({
    model: groq(model),
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens ?? 600,
    temperature: opts.temperature ?? 0.5,
  });
  return text.trim();
}

export async function groqJson<T>(opts: GroqOptions): Promise<T | null> {
  const text = await groqText({
    ...opts,
    system: `${opts.system}\n\nCRITICAL: Output valid JSON only. No markdown, no code fences, no commentary.`,
  });
  try {
    const cleaned = text
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
