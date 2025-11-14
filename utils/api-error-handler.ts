import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { ApiErrorOptions } from "types/api-error";

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

  // Capture to Sentry in production
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

