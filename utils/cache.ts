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
 * Otherwise, returns a public cache header with the specified max age.
 * 
 * @param request - The Next.js request object
 * @param maxAge - The maximum age in seconds for the cache (default: 300)
 * @returns The Cache-Control header value
 * 
 * @example
 * ```ts
 * const cacheControl = getCacheControlHeader(request, 300);
 * return new NextResponse(content, {
 *   headers: { "Cache-Control": cacheControl }
 * });
 * ```
 */
export function getCacheControlHeader(
  request: NextRequest,
  maxAge: number = 300
): string {
  const searchParams = request.nextUrl.searchParams;
  const hasCacheBust = searchParams?.has("v") || searchParams?.has("nocache");

  return hasCacheBust
    ? "no-cache, no-store, must-revalidate"
    : `public, s-maxage=${maxAge}, stale-while-revalidate=0`;
}

