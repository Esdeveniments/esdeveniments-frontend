import { captureException } from "@sentry/nextjs";
import type { SafeFetchOptions, SafeFetchResult } from "types/fetch";

/** Safely extract hostname from URL, returns "unknown" for invalid/relative URLs */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

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
      let responseBody = "";
      try {
        // Try to read body for better error context (many APIs return structured errors)
        const text = await response.text();
        responseBody = text.substring(0, 500); // Truncate to prevent huge logs
      } catch {
        // Ignore body read errors, we already have status/statusText
      }

      const errorMessage = `Fetch failed: ${response.status} ${response.statusText}`;
      captureException(new Error(errorMessage), {
        tags: { ...context?.tags, url: getHostname(url) },
        extra: {
          ...context?.extra,
          status: response.status,
          url,
          ...(responseBody && { responseBody }),
        },
      });
      return {
        data: null,
        error: new Error(errorMessage),
        status: response.status,
      };
    }

    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      const responseText = await response.text();
      const error = new Error(
        `Expected a JSON response but received content-type '${contentType}'.`
      );
      captureException(error, {
        tags: { ...context?.tags, url: getHostname(url) },
        extra: {
          ...context?.extra,
          status: response.status,
          url,
          responseBody: responseText.substring(0, 200),
        },
      });
      return { data: null, error, status: response.status };
    }

    try {
      const data = (await response.json()) as T;
      return { data, error: null, status: response.status };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      captureException(error, {
        tags: {
          ...context?.tags,
          url: getHostname(url),
          phase: "json-parse",
        },
        extra: { ...context?.extra, status: response.status, url },
      });
      return { data: null, error, status: response.status };
    }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const errorMessage = isAbort
      ? `Request timeout after ${timeout}ms`
      : "Fetch failed";

    console.error(errorMessage, error);
    captureException(error, {
      tags: { ...context?.tags, url: getHostname(url) },
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
