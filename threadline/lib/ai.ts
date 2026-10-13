import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new UserFacingError(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      500,
    );
  }
  client ??= new Anthropic();
  return client;
}

/** An error whose message is safe and useful to show in the UI. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

type StructuredCall<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Extra checks the schema can't express (e.g. ids must exist). Return a problem description or null. */
  check?: (value: T) => string | null;
  effort?: "low" | "medium" | "high";
};

/**
 * Ask Claude for JSON matching `schema`. The SDK validates the response with zod.
 * If the output is invalid (bad JSON, schema mismatch, failed `check`, or truncated),
 * retry once, telling the model what was wrong.
 */
export async function callStructured<T>({
  system,
  prompt,
  schema,
  check,
  effort = "high",
}: StructuredCall<T>): Promise<T> {
  const anthropic = getClient();
  let problem: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const content: string =
      problem === null
        ? prompt
        : `${prompt}\n\nYour previous answer was rejected: ${problem}\nReturn a corrected answer.`;

    try {
      const response = await anthropic.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content }],
        thinking: { type: "adaptive" },
        output_config: { effort, format: betaZodOutputFormat(schema) },
        // If a safety classifier declines, re-run on Anthropic's recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (response.stop_reason === "refusal") {
        throw new UserFacingError("The AI declined to answer this request. Try rewording your ideas.", 422);
      }
      if (response.stop_reason === "max_tokens") {
        problem = "the response was cut off before the JSON was complete. Be more concise.";
        continue;
      }
      const parsed: T | null = response.parsed_output;
      if (parsed == null) {
        problem = "no JSON object was returned.";
        continue;
      }
      const issue: string | null = check?.(parsed) ?? null;
      if (issue) {
        problem = issue;
        continue;
      }
      return parsed;
    } catch (err) {
      if (err instanceof UserFacingError) throw err;
      if (err instanceof Anthropic.AuthenticationError) {
        throw new UserFacingError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.", 500);
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new UserFacingError("Rate limited by the Anthropic API. Wait a moment and try again.", 429);
      }
      if (err instanceof Anthropic.APIConnectionError) {
        throw new UserFacingError("Couldn't reach the Anthropic API. Check your connection.", 502);
      }
      if (err instanceof Anthropic.APIError) {
        throw new UserFacingError(`Anthropic API error (${err.status ?? "unknown"}): ${err.message}`, 502);
      }
      if (err instanceof Anthropic.AnthropicError) {
        // Raised by the SDK when the output isn't valid JSON or fails zod validation.
        console.warn(`[threadline] invalid structured output (attempt ${attempt + 1}):`, err.message);
        problem = `it did not match the required schema. ${err.message.slice(0, 1500)}`;
        continue;
      }
      throw err;
    }
  }

  console.warn("[threadline] giving up after retry:", problem);
  throw new UserFacingError("The AI returned an invalid response twice. Please try again.", 502);
}
