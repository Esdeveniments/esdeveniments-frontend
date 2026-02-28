import type { Event, EventHint, ErrorEvent, Metric } from "@sentry/nextjs";

/**
 * Well-known error patterns to ignore at SDK level (before serialization).
 * Used in Sentry.init({ ignoreErrors }) across all runtimes.
 * More performant than filtering in beforeSend — SDK skips serialization entirely.
 */
export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  // Browser extension errors
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /extension:\/\//i,
  // Webpack chunk loading failures (often caused by ad blockers or stale deployments)
  "ChunkLoadError",
  /Loading chunk [\d]+ failed/i,
  "__webpack_require__",
  // Ad blocker interference
  /adblock/i,
  /advertisement/i,
  // Next.js rolling deployment mismatch — old client hits new server. Not actionable.
  "Failed to find Server Action",
];

/**
 * Deny errors originating from browser extension URLs.
 * Used in Sentry.init({ denyUrls }) — client config only.
 */
export const SENTRY_DENY_URLS: Array<string | RegExp> = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
];

/**
 * Check if an error originates from the image proxy route.
 */
function isImageProxyError(event: Event | ErrorEvent): boolean {
  // Check request URL (most reliable, available even with tracesSampleRate: 0)
  const requestUrl = event.request?.url || "";
  if (requestUrl.includes("/api/image-proxy")) return true;
  // Fallback: check transaction name (set by Next.js instrumentation)
  if (event.transaction?.includes("/api/image-proxy")) return true;
  return false;
}

/**
 * Filters and sanitizes Sentry events before sending.
 * Implements best practices for production error monitoring:
 * - Uses hint.originalException for reliable error inspection
 * - Filters non-critical errors that can't be handled in ignoreErrors
 * - Scrubs sensitive data (passwords, tokens, API keys, etc.)
 *
 * Note: Well-known noise patterns (extensions, chunk errors, ad blockers,
 * deployment mismatch) are handled by SENTRY_IGNORE_ERRORS in init config.
 * This function handles context-dependent filtering that needs event metadata.
 */
export function beforeSend(
  event: Event | ErrorEvent,
  hint: EventHint,
): Event | ErrorEvent | null {
  const originalError = hint.originalException;

  // Use the original exception for reliable type and message checking
  if (originalError instanceof Error) {
    const message = originalError.message.toLowerCase();
    const errorName = originalError.name.toLowerCase();

    // Image proxy fetch failures: external images unavailable (broken links, domains down).
    // Scoped to image-proxy route only — don't suppress fetch failures elsewhere.
    if (message.includes("fetch failed for ") && isImageProxyError(event)) {
      return null;
    }

    // Timeout errors from image proxy: external servers too slow to respond.
    // Scoped to image-proxy route — timeouts in real API calls should still be reported.
    if (
      (errorName === "timeouterror" ||
        errorName === "aborterror" ||
        message.includes("the operation was aborted due to timeout") ||
        message.includes("the operation was aborted")) &&
      isImageProxyError(event)
    ) {
      return null;
    }
  }

  // Fallback: check serialized exception values for edge cases where
  // hint.originalException is not an Error instance (e.g., thrown strings)
  if (event.exception?.values?.[0]) {
    const errorMessage = event.exception.values[0].value?.toLowerCase() || "";

    // Non-JSON responses (often network/proxy issues)
    if (errorMessage.includes("non-json")) {
      return null;
    }

    // Network errors that are non-critical (already retried client-side)
    if (
      errorMessage.includes("networkerror") &&
      errorMessage.includes("failed to fetch")
    ) {
      return null;
    }
  }

  // Scrub sensitive data from event
  const request = event.request;
  if (request?.query_string) {
    // Remove sensitive query parameters
    const sensitiveParams = [
      "password",
      "token",
      "api_key",
      "apikey",
      "secret",
      "auth",
      "authorization",
    ];
    if (typeof request.query_string === "string") {
      // Parse and filter query string
      const params = new URLSearchParams(request.query_string);
      sensitiveParams.forEach((param) => {
        if (params.has(param)) {
          params.set(param, "[Filtered]");
        }
      });
      request.query_string = params.toString();
    }
  }

  // Scrub sensitive headers
  if (request?.headers) {
    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
    ];
    sensitiveHeaders.forEach((header) => {
      const headerKey = Object.keys(request.headers || {}).find(
        (k) => k.toLowerCase() === header.toLowerCase(),
      );
      if (headerKey && request.headers) {
        request.headers[headerKey] = "[Filtered]";
      }
    });
  }

  // Scrub sensitive data from user context
  if (event.user) {
    // Keep user ID but remove sensitive fields
    const { id, username } = event.user;
    event.user = { id, username };
  }

  // Scrub sensitive data from extra context
  if (event.extra) {
    const sensitiveKeys = [
      "password",
      "token",
      "apiKey",
      "api_key",
      "secret",
      "auth",
      "authorization",
    ];
    sensitiveKeys.forEach((key) => {
      if (event.extra?.[key]) {
        event.extra[key] = "[Filtered]";
      }
    });
  }

  return event;
}

/**
 * Client-specific beforeSend handler.
 * Browser runtime expects ErrorEvent type.
 */
export function beforeSendClient(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Server-specific beforeSend handler.
 * Node runtime expects ErrorEvent type in v10.27.0+.
 */
export function beforeSendServer(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Edge-specific beforeSend handler.
 * Edge runtime requires ErrorEvent type specifically.
 */
export function beforeSendEdge(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Filters and sanitizes Sentry metrics before sending.
 * Implements best practices for metrics monitoring:
 * - Scrubs sensitive data from metric attributes
 * - Filters out metrics that shouldn't be sent
 * - Prevents information disclosure
 *
 * Use with beforeSendMetric option in Sentry.init()
 */
export function beforeSendMetric(metric: Metric): Metric | null {
  // Scrub sensitive data from metric attributes
  if (metric.attributes) {
    const sensitiveKeys = [
      "password",
      "token",
      "api_key",
      "apikey",
      "secret",
      "auth",
      "authorization",
    ];
    sensitiveKeys.forEach((key) => {
      if (metric.attributes?.[key]) {
        metric.attributes[key] = "[Filtered]";
      }
    });
  }

  return metric;
}
