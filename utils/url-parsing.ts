/**
 * URL parsing utilities for client-side components
 * Complements the server-side URL parsing in url-filters.ts
 */

import { URLSegments } from "../types/url-parsing";

/**
 * Extract URL segments from a pathname
 * Handles the new URL structure where /tots/ is omitted for default date
 */
export function extractURLSegments(pathname: string): URLSegments {
  // Remove leading slash and split into segments
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);

  // Handle different URL patterns
  switch (segments.length) {
    case 0:
      // Root path "/"
      return {};

    case 1:
      // "/catalunya"
      return { place: segments[0] };

    case 2:
      // "/catalunya/festivals" or "/catalunya/avui"
      // The parsing logic will determine if second segment is date or category
      return { place: segments[0], date: segments[1] };

    case 3:
      // "/catalunya/avui/festivals"
      return { place: segments[0], date: segments[1], category: segments[2] };

    default:
      // Handle edge cases - take first 3 segments
      return { place: segments[0], date: segments[1], category: segments[2] };
  }
}

/**
 * Debug helper to log URL parsing details
 */
export function debugURLParsing(
  pathname: string,
  segments: URLSegments,
  parsed: unknown
) {
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 URL Parsing Debug:", {
      pathname,
      extractedSegments: segments,
      parsedResult: parsed,
    });
  }
}
