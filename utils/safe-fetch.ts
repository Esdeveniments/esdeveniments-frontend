import { captureException } from "@sentry/nextjs";
import type { SafeFetchOptions, SafeFetchResult } from "types/fetch";

/**
 * Safe fetch wrapper with timeout and response validation.
 * Use for external webhooks/services that don't need HMAC signing.
 *
 * Features:
 * - Configurable timeout (default 5s) to prevent hanging in serverless
 * - Response validation (logs non-OK responses to Sentry)
 * - Consistent error handling
 *
 * For internal API calls that need HMAC, use `fetchWithHmac` instead.
 *
 * @example
 * const { data, error } = await safeFetch<{ success: boolean }>(
 *   webhookUrl,
 *   {
 *     method: "POST",
 *     body: JSON.stringify({ title }),
 *     context: { tags: { action: "webhook" } }
 *   }
 * );
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const { timeout = 5000, context, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorMessage = `Fetch failed: ${response.status} ${response.statusText}`;
      captureException(new Error(errorMessage), {
        tags: { ...context?.tags, url: new URL(url).hostname },
        extra: { ...context?.extra, status: response.status, url },
      });
      return {
        data: null,
        error: new Error(errorMessage),
        status: response.status,
      };
    }

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? ((await response.json()) as T)
      : ((await response.text()) as unknown as T);

    return { data, error: null, status: response.status };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const errorMessage = isAbort
      ? `Request timeout after ${timeout}ms`
      : "Fetch failed";

    console.error(errorMessage, error);
    captureException(error, {
      tags: { ...context?.tags, url: new URL(url).hostname },
      extra: { ...context?.extra, url, timeout },
    });

    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget fetch for webhooks/notifications.
 * Logs errors but never throws or blocks.
 *
 * @example
 * await fireAndForgetFetch(webhookUrl, {
 *   method: "POST",
 *   body: JSON.stringify({ event: "published" }),
 *   context: { tags: { action: "notify" } }
 * });
 */
export async function fireAndForgetFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<void> {
  await safeFetch(url, options);
  // Intentionally void - errors are logged but not surfaced
}
