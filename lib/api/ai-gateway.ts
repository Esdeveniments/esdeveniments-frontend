import "server-only";
import { z } from "zod";
import { safeFetch } from "@utils/safe-fetch";
import type {
  AiGatewayCompletionOptions,
  AiGatewayCompletionResult,
} from "types/api/poster";

const DEFAULT_AI_GATEWAY_URL =
  "https://ai-gateway-livid-eight.vercel.app/api/chat/completions";
const DEFAULT_AI_GATEWAY_CASCADE = "general";
// Nested below the client 52s timeout so the server aborts cleanly first.
const DEFAULT_AI_GATEWAY_TIMEOUT_MS = 48_000;

const AiGatewayResponseSchema = z.object({
  model: z.string().nullish(),
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().nullish(),
          })
          .optional(),
      }),
    )
    .optional(),
});

function getGatewayToken(): string {
  return process.env.GATEWAY_TOKEN?.trim() ?? "";
}

function getGatewayUrl(): string {
  const configured = process.env.AI_GATEWAY_URL?.trim();
  if (!configured) return DEFAULT_AI_GATEWAY_URL;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return configured;
    }
  } catch {
    // Fall back to default URL when env override is malformed.
  }
  return DEFAULT_AI_GATEWAY_URL;
}

function getDefaultCascade(): string {
  return process.env.AI_GATEWAY_CASCADE?.trim() || DEFAULT_AI_GATEWAY_CASCADE;
}

/** True when the hosted ai-gateway token is configured at runtime. */
export function isAiGatewayConfigured(): boolean {
  return getGatewayToken().length > 0;
}

/**
 * Verifies that the serving model reported by ai-gateway is an allowlisted
 * vision-capable model (Google AI Studio Gemini models by default, or any
 * prefix listed in `AI_GATEWAY_ALLOWED_VISION_MODELS`). Rejects text-only or
 * unverified fallback models so hallucinated JSON is never written to the form.
 */
export function isAllowedVisionModel(model: string | null): boolean {
  if (!model) return false;
  const normalized = model.trim().toLowerCase();
  if (!normalized) return false;

  const customPrefixes = (process.env.AI_GATEWAY_ALLOWED_VISION_MODELS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (customPrefixes.length > 0) {
    return customPrefixes.some(
      (prefix) => normalized === prefix || normalized.startsWith(prefix),
    );
  }

  return (
    normalized.startsWith("gemini/") ||
    normalized.startsWith("gemini-") ||
    normalized.startsWith("google/gemini-") ||
    normalized.startsWith("gemma-4") ||
    normalized.startsWith("google/gemma-4")
  );
}

/**
 * Calls the hosted albertolive/ai-gateway endpoint (OpenAI-compatible
 * `/api/chat/completions`, defaulting to the `general` cascade which leads with
 * Google AI Studio Gemini models with strict `json_schema` and vision support).
 *
 * Privacy: never logs poster images, prompts, or model output to Sentry.
 */
export async function completeWithAiGateway(
  options: AiGatewayCompletionOptions,
): Promise<AiGatewayCompletionResult> {
  const token = getGatewayToken();
  if (!token) {
    return {
      ok: false,
      reason: "not_configured",
      status: null,
      message: "AI gateway is not configured",
    };
  }

  if (options.signal?.aborted) {
    return {
      ok: false,
      reason: "aborted",
      status: null,
      message: "AI gateway request aborted",
    };
  }

  const cascade = options.cascade?.trim() || getDefaultCascade();
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_GATEWAY_TIMEOUT_MS;
  // Pass a nested server-side cascade budget (45s for 48s timeout) so the
  // hosted gateway abandons slow failover inside our request deadline.
  const budgetSeconds = Math.max(5, Math.floor(timeoutMs / 1000) - 3);
  const payload: Record<string, unknown> = {
    model: cascade,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
    budget_s: budgetSeconds,
  };

  if (options.schema) {
    payload.response_format = {
      type: "json_schema",
      json_schema: {
        name: options.schemaName ?? "response",
        strict: true,
        schema: options.schema,
      },
    };
  }

  const { data, error, status } = await safeFetch<unknown>(getGatewayUrl(), {
    method: "POST",
    cache: "no-store",
    timeout: timeoutMs,
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    context: {
      tags: { section: "ai-gateway", cascade },
      extra: {
        hasSchema: Boolean(options.schema),
        messageCount: options.messages.length,
      },
    },
  });

  if (options.signal?.aborted) {
    return {
      ok: false,
      reason: "aborted",
      status: null,
      message: "AI gateway request aborted",
    };
  }

  if (error || !data) {
    const isTimeout =
      status === 408 ||
      status === 504 ||
      (error instanceof Error &&
        error.message.toLowerCase().includes("timeout"));
    return {
      ok: false,
      reason: isTimeout ? "timeout" : "upstream_error",
      status,
      message: isTimeout
        ? "AI gateway timed out"
        : "AI gateway request failed",
    };
  }

  const parsed = AiGatewayResponseSchema.safeParse(data);
  const content = parsed.success
    ? parsed.data.choices?.[0]?.message?.content?.trim() ?? ""
    : "";

  if (!content) {
    return {
      ok: false,
      reason: "upstream_error",
      status,
      message: "AI gateway returned an empty response",
    };
  }

  return {
    ok: true,
    content,
    model: parsed.success ? parsed.data.model ?? null : null,
  };
}
