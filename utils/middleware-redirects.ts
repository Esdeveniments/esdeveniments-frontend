/**
 * Middleware-specific URL canonicalization and redirection logic
 * Handles redirects for place routes to ensure canonical URL structure
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidDateSlug } from "@lib/dates";

/**
 * Handles canonical redirects for place routes
 * Returns a redirect response if the URL needs to be canonicalized, null otherwise
 */
export function handleCanonicalRedirects(
  request: NextRequest
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const searchParams = request.nextUrl.searchParams;
  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

  // Skip known non-place top-level routes
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

  const place = segments[0] || "catalunya";
  const segmentCount = segments.length;
  const hasTotsInSegments =
    (segmentCount === 3 || segmentCount === 2) && segments[1] === "tots";

  // Handle redirects: combine /tots segments with query params if present
  if (
    hasTotsInSegments ||
    (segmentCount === 1 && (queryCategory || queryDate))
  ) {
    // Build canonical URL: omit "tots" values
    let canonicalPath = `/${place}`;

    // Determine date: from segment (if not tots) or query param
    let date: string | null = null;
    if (segmentCount === 2 && segments[1] !== "tots") {
      // /place/date - check if it's a valid date
      const secondSegment = segments[1];
      date = isValidDateSlug(secondSegment) ? secondSegment : null;
    }
    if (
      !date &&
      queryDate &&
      isValidDateSlug(queryDate) &&
      queryDate !== "tots"
    ) {
      date = queryDate;
    }

    // Determine category: from segment (if not tots) or query param
    let category: string | null = null;
    if (hasTotsInSegments && segmentCount === 3) {
      // /place/tots/category - category is in third segment
      category = segments[2] !== "tots" ? segments[2] : null;
    } else if (segmentCount === 2 && segments[1] !== "tots") {
      // /place/X - check if X is a category (not a date)
      const secondSegment = segments[1];
      if (!isValidDateSlug(secondSegment)) {
        category = secondSegment !== "tots" ? secondSegment : null;
      }
    } else if (queryCategory && queryCategory !== "tots") {
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

    // Preserve other query params (search, distance, lat, lon)
    const remainingParams = new URLSearchParams(searchParams);
    remainingParams.delete("category");
    remainingParams.delete("date");
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
      isValidDateSlug(secondSegment) && secondSegment !== "tots";

    let date: string | null = null;
    let category: string | null = null;

    if (secondIsDate) {
      // /place/date?category=foo
      date = secondSegment;
      if (queryCategory && queryCategory !== "tots") {
        category = queryCategory;
      }
    } else {
      // /place/category?date=foo
      category = secondSegment !== "tots" ? secondSegment : null;
      if (queryDate && isValidDateSlug(queryDate) && queryDate !== "tots") {
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

    // Preserve other query params (search, distance, lat, lon)
    const remainingParams = new URLSearchParams(searchParams);
    remainingParams.delete("category");
    remainingParams.delete("date");
    const remainingQuery = remainingParams.toString();
    const finalUrl = remainingQuery
      ? `${canonicalPath}?${remainingQuery}`
      : canonicalPath;

    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  return null;
}
