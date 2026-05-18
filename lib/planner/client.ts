import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "types/planner";

// GitHub Models exposes an OpenAI-compatible inference endpoint hosted on Azure.
// Free for prototyping with strict rate limits — perfect for a PoC.
// Auth: a GitHub PAT or Actions GITHUB_TOKEN with `models:read` scope.
const GITHUB_MODELS_BASE_URL = "https://models.github.ai/inference";

export const PLANNER_MODEL_ID = "openai/gpt-4o-mini";

const TOKEN_ENV_KEYS = [
  "GITHUB_MODELS_TOKEN",
  "GITHUB_TOKEN",
] as const;

function resolveToken(): string | null {
  for (const key of TOKEN_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length > 0) return value;
  }
  return null;
}

export function isPlannerConfigured(): boolean {
  return resolveToken() !== null;
}

export async function chatCompletions(
  request: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  const token = resolveToken();
  if (!token) {
    throw new Error(
      "Planner LLM is not configured: set GITHUB_MODELS_TOKEN or GITHUB_TOKEN.",
    );
  }

  const response = await fetch(`${GITHUB_MODELS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub Models request failed: ${response.status} ${response.statusText} ${body}`.trim(),
    );
  }

  return (await response.json()) as ChatCompletionResponse;
}
