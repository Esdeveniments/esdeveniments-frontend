/**
 * Middleware-specific URL canonicalization and redirection logic
 * Handles redirects for place routes to ensure canonical URL structure
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidDateSlug } from "@lib/dates";
import { DEFAULT_FILTER_VALUE } from "./constants";

// DOS protection: limits on query parameters
const MAX_QUERY_STRING_LENGTH = 2048; // Total query string length
const MAX_QUERY_PARAMS = 50; // Maximum number of query parameters
const MAX_PARAM_VALUE_LENGTH = 500; // Maximum length of individual parameter value
const MAX_PARAM_KEY_LENGTH = 100; // Maximum length of individual parameter key

// Allowed query parameters to preserve in redirects (security: allowlist only)
const ALLOWED_QUERY_PARAMS = new Set(["search", "distance", "lat", "lon"]);

/**
 * Validates query parameters to prevent DOS attacks
 * Returns true if query params are within safe limits, false otherwise
 */
function validateQueryParams(
  searchParams: URLSearchParams,
  queryString: string
): boolean {
  // Check total query string length (use raw query string to avoid toString() overhead)
  if (queryString.length > MAX_QUERY_STRING_LENGTH) {
    return false;
  }

  // Check number of parameters and individual value lengths in a single pass
  let paramCount = 0;
  for (const [key, value] of searchParams.entries()) {
    paramCount++;
    if (paramCount > MAX_QUERY_PARAMS) {
      return false;
    }
    if (value.length > MAX_PARAM_VALUE_LENGTH) {
      return false;
    }
    // Also check key length (though keys are typically short)
    if (key.length > MAX_PARAM_KEY_LENGTH) {
      return false;
    }
  }

  return true;
}

/**
 * Handles canonical redirects for place routes
 * Returns a redirect response if the URL needs to be canonicalized, null otherwise
 */
export function handleCanonicalRedirects(
  request: NextRequest
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // Skip known non-place top-level routes early (performance: avoid query validation)
  const firstSegment = segments[0] || "";
  const nonPlaceFirstSegments = new Set([
    "noticies",
    "publica",
    "login",
    "offline",
    "e",
    "sitemap",
    "rss.xml",
    "qui-som",
    "server-sitemap.xml",
    "server-news-sitemap.xml",
    "server-google-news-sitemap.xml",
  ]);

  // Only process redirects for place routes
  if (nonPlaceFirstSegments.has(firstSegment)) {
    return null;
  }

  const searchParams = request.nextUrl.searchParams;
  const queryString = request.nextUrl.search; // Raw query string (includes '?')

  // DOS protection: validate query parameters before processing
  if (!validateQueryParams(searchParams, queryString)) {
    // Return null to skip redirect processing for suspicious requests
    // This prevents resource exhaustion while still allowing the request to proceed
    return null;
  }

  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

  const place = segments[0] || "catalunya";
  const segmentCount = segments.length;
  const hasTotsInSegments =
    (segmentCount === 3 || segmentCount === 2) &&
    segments[1] === DEFAULT_FILTER_VALUE;
  const hasTotsCategory =
    segmentCount >= 3 && segments[2] === DEFAULT_FILTER_VALUE;

  // Handle redirects: combine /tots segments with query params if present
  if (
    hasTotsInSegments ||
    hasTotsCategory ||
    (segmentCount === 1 && (queryCategory || queryDate))
  ) {
    // Build canonical URL: omit "tots" values
    let canonicalPath = `/${place}`;

    // Determine date: from segment (if not tots) or query param
    let date: string | null = null;
    if (segmentCount >= 2 && segments[1] !== DEFAULT_FILTER_VALUE) {
      // /place/date - check if it's a valid date
      const secondSegment = segments[1];
      date = isValidDateSlug(secondSegment) ? secondSegment : null;
    }
    if (
      !date &&
      queryDate &&
      isValidDateSlug(queryDate) &&
      queryDate !== DEFAULT_FILTER_VALUE
    ) {
      date = queryDate;
    }

    // Determine category: from segment (if not tots) or query param
    let category: string | null = null;
    if (segmentCount >= 3) {
      const secondSegment = segments[1];
      const thirdSegment = segments[2];
      if (thirdSegment !== DEFAULT_FILTER_VALUE) {
        // /place/<something>/<category>
        category = thirdSegment;
      } else if (
        !isValidDateSlug(secondSegment) &&
        secondSegment !== DEFAULT_FILTER_VALUE
      ) {
        // /place/<category>/tots -> keep category from second segment
        category = secondSegment;
      } else {
        // /place/<date>/tots or /place/tots/tots -> drop category placeholder
        category = null;
      }
    } else if (segmentCount === 2 && segments[1] !== DEFAULT_FILTER_VALUE) {
      // /place/X - check if X is a category (not a date)
      const secondSegment = segments[1];
      if (!isValidDateSlug(secondSegment)) {
        category =
          secondSegment !== DEFAULT_FILTER_VALUE ? secondSegment : null;
      }
    } else if (queryCategory && queryCategory !== DEFAULT_FILTER_VALUE) {
      category = queryCategory;
    }

    // Build canonical path based on date and category
    if (date && category) {
      canonicalPath = `/${place}/${date}/${category}`;
    } else if (date) {
      canonicalPath = `/${place}/${date}`;
    } else if (category) {
      canonicalPath = `/${place}/${category}`;
    }
    // If both are null/tots, canonicalPath stays as /place

    // Preserve allowed query params only (security: allowlist approach)
    const remainingParams = new URLSearchParams();
    for (const key of ALLOWED_QUERY_PARAMS) {
      const value = searchParams.get(key);
      if (value !== null) {
        remainingParams.set(key, value);
      }
    }
    const remainingQuery = remainingParams.toString();
    const finalUrl = remainingQuery
      ? `${canonicalPath}?${remainingQuery}`
      : canonicalPath;

    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  } else if (segmentCount === 2 && (queryCategory || queryDate)) {
    // Handle redirects for 2-segment paths with legacy query params
    // Examples:
    // - /place/date?category=foo      -> /place/date/foo
    // - /place/category?date=avui     -> /place/avui/category
    const secondSegment = segments[1];
    const secondIsDate =
      isValidDateSlug(secondSegment) && secondSegment !== DEFAULT_FILTER_VALUE;

    let date: string | null = null;
    let category: string | null = null;

    if (secondIsDate) {
      // /place/date?category=foo
      date = secondSegment;
      if (queryCategory && queryCategory !== DEFAULT_FILTER_VALUE) {
        category = queryCategory;
      }
    } else {
      // /place/category?date=foo
      category = secondSegment !== DEFAULT_FILTER_VALUE ? secondSegment : null;
      if (
        queryDate &&
        isValidDateSlug(queryDate) &&
        queryDate !== DEFAULT_FILTER_VALUE
      ) {
        date = queryDate;
      }
    }

    // Build canonical path based on date and category
    let canonicalPath = `/${place}`;
    if (date && category) {
      canonicalPath = `/${place}/${date}/${category}`;
    } else if (date) {
      canonicalPath = `/${place}/${date}`;
    } else if (category) {
      canonicalPath = `/${place}/${category}`;
    }

    // Preserve allowed query params only (security: allowlist approach)
    const remainingParams = new URLSearchParams();
    for (const key of ALLOWED_QUERY_PARAMS) {
      const value = searchParams.get(key);
      if (value !== null) {
        remainingParams.set(key, value);
      }
    }
    const remainingQuery = remainingParams.toString();
    const finalUrl = remainingQuery
      ? `${canonicalPath}?${remainingQuery}`
      : canonicalPath;

    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  return null;
}
