import type { Event, EventHint, ErrorEvent, Metric } from "@sentry/nextjs";

/**
 * Filters and sanitizes Sentry events before sending.
 * Implements best practices for production error monitoring:
 * - Filters out non-critical errors (browser extensions, ad blockers, etc.)
 * - Scrubs sensitive data (passwords, tokens, API keys, etc.)
 * - Prevents information disclosure
 *
 * Works with both Event (client/server) and ErrorEvent (edge) types.
 */
export function beforeSend(
  event: Event | ErrorEvent,
  _hint: EventHint
): Event | ErrorEvent | null {
  // Filter out errors from browser extensions and ad blockers
  if (event.exception) {
    const errorMessage = event.exception.values?.[0]?.value?.toLowerCase() || "";
    const errorType = event.exception.values?.[0]?.type?.toLowerCase() || "";

    // Common browser extension errors
    if (
      errorMessage.includes("chrome-extension://") ||
      errorMessage.includes("moz-extension://") ||
      errorMessage.includes("safari-extension://") ||
      errorMessage.includes("extension://") ||
      errorMessage.includes("__webpack_require__") ||
      errorMessage.includes("non-json") ||
      // Ad blocker related errors
      errorMessage.includes("adblock") ||
      errorMessage.includes("advertisement") ||
      // Network errors that are often non-critical
      (errorMessage.includes("networkerror") && errorMessage.includes("failed to fetch"))
    ) {
      return null; // Don't send these errors
    }
    
    // Note: ChunkLoadError filtering removed - now handled with retry mechanism
    // We want to track these errors to monitor if retries are working effectively
  }

  // Scrub sensitive data from event
  const request = event.request;
  if (request?.query_string) {
    // Remove sensitive query parameters
    const sensitiveParams = ["password", "token", "api_key", "apikey", "secret", "auth", "authorization"];
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
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key", "x-auth-token"];
    sensitiveHeaders.forEach((header) => {
      const headerKey = Object.keys(request.headers || {}).find(
        (k) => k.toLowerCase() === header.toLowerCase()
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
    const sensitiveKeys = ["password", "token", "apiKey", "api_key", "secret", "auth", "authorization"];
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
  hint: EventHint
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Server-specific beforeSend handler.
 * Node runtime expects ErrorEvent type in v10.27.0+.
 */
export function beforeSendServer(
  event: ErrorEvent,
  hint: EventHint
): ErrorEvent | null {
  return beforeSend(event, hint) as ErrorEvent | null;
}

/**
 * Edge-specific beforeSend handler.
 * Edge runtime requires ErrorEvent type specifically.
 */
export function beforeSendEdge(
  event: ErrorEvent,
  hint: EventHint
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
    const sensitiveKeys = ["password", "token", "api_key", "apikey", "secret", "auth", "authorization"];
    sensitiveKeys.forEach((key) => {
      if (metric.attributes?.[key]) {
        metric.attributes[key] = "[Filtered]";
      }
    });
  }

  return metric;
}

