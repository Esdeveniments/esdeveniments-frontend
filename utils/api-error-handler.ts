import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Error response options for API error handling
 */
export interface ApiErrorOptions {
  /** HTTP status code (default: 500) */
  status?: number;
  /** Error message to return in response */
  errorMessage?: string;
  /** Fallback data structure to return (e.g., empty array, empty object) */
  fallbackData?: unknown;
  /** Additional context for Sentry (tags, extra data, etc.) */
  sentryContext?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  };
}

/**
 * Shared error handler for API routes that:
 * 1. Captures exceptions to Sentry (production only)
 * 2. Logs errors to console
 * 3. Returns a standardized error response
 *
 * @param error - The error that occurred
 * 2. @param routePath - The API route path for context (e.g., "/api/events")
 * @param options - Optional configuration for error response
 * @returns NextResponse with appropriate error status and body
 */
export function handleApiError(
  error: unknown,
  routePath: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const {
    status = 500,
    errorMessage,
    fallbackData,
    sentryContext,
  } = options;

  // Normalize error to Error object for better logging
  const errorObj =
    error instanceof Error
      ? error
      : new Error(
          typeof error === "string" ? error : "Unknown error occurred"
        );

  // Log to console for local debugging
  console.error(`${routePath} error:`, errorObj);

  // Capture to Sentry in production (send only sanitized, minimal data)
  if (process.env.NODE_ENV === "production") {
    // Build sanitized tags
    const sentryTags = {
      route: routePath,
      ...sentryContext?.tags,
    };

    // Build sanitized extras: only primitive values, limited length, and excluding sensitive keys
    const sanitizedExtra: Record<string, unknown> = { routePath };
    if (sentryContext?.extra && typeof sentryContext.extra === "object") {
      const sensitiveKeyPattern = /(pass(word)?|token|secret|ssn|credit|card|session|auth)/i;
      for (const [k, v] of Object.entries(sentryContext.extra)) {
        if (sensitiveKeyPattern.test(k)) continue;
        const t = typeof v;
        if (v === null) {
          sanitizedExtra[k] = null;
        } else if (t === "string") {
          const str = v as string;
          sanitizedExtra[k] =
            str.length > 200 ? str.slice(0, 200) + "...[truncated]" : str;
        } else if (t === "number" || t === "boolean") {
          sanitizedExtra[k] = v;
        } else {
          // skip objects/arrays to avoid leaking nested sensitive data
        }
      }
    }

    Sentry.withScope((scope) => {
      scope.setTags(sentryTags);
      scope.setExtras(sanitizedExtra);
      // Send only the error message to avoid transmitting full stack traces or error objects
      Sentry.captureException({ message: errorObj.message ?? "Error" });
    });
  }

  // Determine response body
  let responseBody: unknown;
  if (fallbackData !== undefined) {
    // Use provided fallback data (e.g., empty array, empty object)
    responseBody = fallbackData;
  } else if (errorMessage) {
    // Use provided error message
    responseBody = { error: errorMessage };
  } else {
    // Default: generic error message
    responseBody = { error: "Internal server error" };
  }

  return NextResponse.json(responseBody, { status });
}

