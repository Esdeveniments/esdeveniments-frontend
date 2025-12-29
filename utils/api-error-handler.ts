import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { ApiErrorOptions } from "types/api-error";

/**
 * Sanitizes error messages before logging to prevent information disclosure.
 * Extracts a safe string representation from unknown error types.
 *
 * @param error - The error to sanitize (Error, string, or unknown)
 * @returns A safe error message string
 */
export function getSanitizedErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

/**
 * Shared error handler for API routes that:
 * 1. Captures exceptions to Sentry (production only)
 * 2. Logs errors using Sentry logger (when available) or console
 * 3. Returns a standardized error response
 *
 * @param error - The error that occurred
 * @param routePath - The API route path for context (e.g., "/api/events")
 * @param options - Optional configuration for error response
 * @returns NextResponse with appropriate error status and body
 */
export function handleApiError(
  error: unknown,
  routePath: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const { status = 500, errorMessage, fallbackData, sentryContext } = options;

  // Normalize error to Error object for better logging
  // Use getSanitizedErrorMessage for consistency with other error handling
  const errorObj =
    error instanceof Error ? error : new Error(getSanitizedErrorMessage(error));

  // Log to console - consoleLoggingIntegration will automatically send to Sentry in production
  // when enableLogs: true is set in config. This is the recommended approach for v10.27.0+
  console.error(`${routePath} error:`, errorObj);

  // Capture exception to Sentry in production
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(errorObj, {
      tags: {
        route: routePath,
        ...sentryContext?.tags,
      },
      extra: {
        routePath,
        ...sentryContext?.extra,
      },
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
