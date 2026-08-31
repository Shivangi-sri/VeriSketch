import type { Schema } from "@google/generative-ai";
import type AnthropicSDK from "@anthropic-ai/sdk";
import { withRetry } from "@/lib/skills/rate-limit";

export type StructuredSchema = Record<string, unknown>;

/**
 * Single LLM provider abstraction. Picks a backend from env, in this order:
 *
 *   1. OPENAI_API_KEY  -> any OpenAI-compatible endpoint (Groq, Ollama,
 *      OpenRouter, Together, Mistral, ...). Free options: Groq or local Ollama.
 *   2. ANTHROPIC_API_KEY -> Claude (forced tool call for structured JSON).
 *   3. GEMINI_API_KEY  -> Gemini (responseSchema).
 *
 * All paths return the same schema-constrained JSON object.
 */
export async function generateStructured<T>(
  prompt: string,
  schema: StructuredSchema,
): Promise<T> {
  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAICompatible<T>(prompt, schema);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic<T>(prompt, schema);
  }
  return generateWithGemini<T>(prompt, schema);
}

/* -------------------------------------------------------------------------- */
/* OpenAI-compatible (Groq / Ollama / OpenRouter / Together / Mistral / ...)  */
/* -------------------------------------------------------------------------- */

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function parseOpenAICompatibleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown LLM error");

  if (/ECONNREFUSED|fetch failed|ENOTFOUND|network/i.test(message)) {
    return "Could not reach the LLM endpoint. Check OPENAI_BASE_URL in .env.local (for local Ollama, run `ollama serve` first).";
  }
  if (/401|invalid_api_key|unauthor|no api key/i.test(message)) {
    return "LLM API key is missing or invalid. Set OPENAI_API_KEY in .env.local.";
  }
  if (/429|rate limit|quota|insufficient|credit/i.test(message)) {
    return "LLM rate limit or quota reached for this provider. Wait and retry, or switch OPENAI_MODEL / provider in .env.local.";
  }
  if (/404|model.*(not found|does not exist)|decommission/i.test(message)) {
    return "The configured model is not available at this endpoint. Set OPENAI_MODEL in .env.local to a valid model id for your provider.";
  }
  return message;
}

async function generateWithOpenAICompatible<T>(
  prompt: string,
  schema: StructuredSchema,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL ?? "openai/gpt-oss-120b";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local on the server.");
  }

  const systemInstruction =
    "You are a strict JSON API. Reply with ONE JSON object that conforms exactly to the JSON schema below. " +
    "No markdown, no code fences, no commentary.\n\nJSON schema:\n" +
    JSON.stringify(toJsonSchema(schema));

  try {
    return await withRetry(async () => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${response.status} ${detail.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";

      try {
        return JSON.parse(stripJsonFences(content)) as T;
      } catch {
        throw new Error(`Model returned invalid JSON for structured response: ${content.slice(0, 300)}`);
      }
    }, 2);
  } catch (error) {
    throw new Error(parseOpenAICompatibleError(error));
  }
}

/* -------------------------------------------------------------------------- */
/* Anthropic Claude                                                          */
/* -------------------------------------------------------------------------- */

const GEMINI_TO_JSON_SCHEMA_TYPES: Record<string, string> = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  NUMBER: "number",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  NULL: "null",
};

/** Convert a Gemini-style responseSchema (uppercase types) to JSON Schema. */
function toJsonSchema(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object") return {};
  const input = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof input.type === "string") {
    out.type = GEMINI_TO_JSON_SCHEMA_TYPES[input.type] ?? input.type.toLowerCase();
  }
  if (typeof input.description === "string") out.description = input.description;
  if (Array.isArray(input.enum)) out.enum = input.enum;
  if (Array.isArray(input.required)) out.required = input.required;

  if (input.properties && typeof input.properties === "object") {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input.properties as Record<string, unknown>)) {
      properties[key] = toJsonSchema(value);
    }
    out.properties = properties;
    out.additionalProperties = false;
  }

  if (input.items) {
    out.items = toJsonSchema(input.items);
  }

  return out;
}

function parseAnthropicError(error: unknown): string {
  const err = error as { status?: number; message?: string };
  const status = err?.status;
  const message = err?.message ?? String(error ?? "Unknown Anthropic error");

  if (status === 401 || /api[\s_-]?key|authentication|x-api-key/i.test(message)) {
    return "Claude (Anthropic) API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local on the server.";
  }
  if (status === 429 || status === 529 || /rate limit|quota|overloaded|too many requests/i.test(message)) {
    return "Claude (Anthropic) API rate limit reached. Wait for the limit to reset or check your plan limits, then retry.";
  }
  if (status === 404 || /not[_\s]?found|model/i.test(message)) {
    return "The configured Claude model is not available. Set ANTHROPIC_MODEL in .env.local to a valid id (e.g. claude-haiku-4-5, claude-sonnet-5, or claude-opus-5).";
  }
  return message;
}

async function generateWithAnthropic<T>(prompt: string, schema: StructuredSchema): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Add it to .env.local on the server.");
  }

  const inputSchema = toJsonSchema(schema);
  inputSchema.type = "object";

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  try {
    return await withRetry(async () => {
      const message = await client.messages.create({
        model,
        max_tokens: 16000,
        tools: [
          {
            name: "record_response",
            description: "Record the structured response. Call this exactly once with the complete result.",
            strict: true,
            input_schema: inputSchema as AnthropicSDK.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "record_response" },
        messages: [{ role: "user", content: prompt }],
      });

      const toolUse = message.content.find(
        (block): block is AnthropicSDK.ToolUseBlock => block.type === "tool_use",
      );

      if (!toolUse) {
        const preview = JSON.stringify(message.content).slice(0, 300);
        throw new Error(`Claude did not return a structured tool response: ${preview}`);
      }

      return toolUse.input as T;
    }, 2);
  } catch (error) {
    throw new Error(parseAnthropicError(error));
  }
}

/* -------------------------------------------------------------------------- */
/* Google Gemini (fallback)                                                  */
/* -------------------------------------------------------------------------- */

function parseGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown Gemini error");

  if (/429|Too Many Requests|quota|rate limit|retryDelay/i.test(message)) {
    return "Gemini API quota exceeded. The free-tier limit has been reached for this Google AI project. Add billing to the Google Cloud project or wait for the quota reset, then retry. (Tip: set ANTHROPIC_API_KEY in .env.local to switch to Claude.)";
  }

  if (/404|not found|no longer available|unsupported model|model .* is no longer available/i.test(message)) {
    return "The configured Gemini model is unsupported. Set GEMINI_MODEL=gemini-3.6-flash in .env.local or remove it to use the default supported model.";
  }

  if (/API_KEY|api key|invalid api|GEMINI_API_KEY/i.test(message)) {
    return "Gemini API key is missing or invalid. Set GEMINI_API_KEY in .env.local on the server.";
  }

  return message;
}

async function generateWithGemini<T>(prompt: string, schema: StructuredSchema): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

  if (!apiKey) {
    throw new Error(
      "No LLM provider is configured. Set OPENAI_API_KEY (Groq/Ollama/OpenRouter), ANTHROPIC_API_KEY (Claude), or GEMINI_API_KEY (Gemini) in .env.local on the server.",
    );
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  try {
    return await withRetry(async () => {
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema as unknown as Schema,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Gemini returned invalid JSON for structured response: ${text.slice(0, 300)}`);
      }
    }, 2);
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
}
