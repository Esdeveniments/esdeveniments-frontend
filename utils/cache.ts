import type { NextRequest } from "next/server";

/**
 * Cache control utilities for route handlers
 * 
 * Provides shared logic for determining Cache-Control headers
 * based on cache-busting query parameters.
 */

/**
 * Determines the Cache-Control header value based on cache-busting query parameters.
 * 
 * If cache-busting parameters (`v` or `nocache`) are present, returns a no-cache header.
 * Otherwise, returns a public cache header with the specified max age and stale-while-revalidate.
 * 
 * @param request - The Next.js request object
 * @param maxAge - The maximum age in seconds for the cache (default: 300)
 * @param staleWhileRevalidate - The stale-while-revalidate value in seconds (default: 0)
 * @returns The Cache-Control header value
 * 
 * @example
 * ```ts
 * // Default: no stale-while-revalidate
 * const cacheControl = getCacheControlHeader(request, 300);
 * 
 * // With stale-while-revalidate for better UX
 * const cacheControl = getCacheControlHeader(request, 600, 86400);
 * ```
 */
export function getCacheControlHeader(
  request: NextRequest,
  maxAge: number = 300,
  staleWhileRevalidate: number = 0
): string {
  const searchParams = request.nextUrl.searchParams;
  const hasCacheBust = searchParams?.has("v") || searchParams?.has("nocache");

  if (hasCacheBust) {
    return "no-cache, no-store, must-revalidate";
  }

  return staleWhileRevalidate > 0
    ? `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : `public, s-maxage=${maxAge}, stale-while-revalidate=0`;
}

