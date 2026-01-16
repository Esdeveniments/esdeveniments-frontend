/**
 * Internal API Route Template
 *
 * Copy this template when adding a new internal API route.
 * Replace RESOURCE_NAME placeholders with your resource name.
 *
 * Location: app/api/RESOURCE_NAME/route.ts
 *
 * NOTE: This is a documentation template. When implementing, use these imports:
 * - import { NextResponse } from "next/server";
 * - import type { NextRequest } from "next/server";
 * - import { fetchRESOURCE_NAME } from "@lib/api/RESOURCE_NAME-external";
 */

// Mock types for template validation
type NextRequest = { url: string };
const NextResponse = {
  json: <T>(
    data: T,
    init?: { headers?: Record<string, string>; status?: number }
  ) => ({ data, ...init }),
};

// This would be imported from your external wrapper
declare function fetchRESOURCE_NAME(params: {
  page: number;
  size: number;
}): Promise<{
  content: unknown[];
  totalElements: number;
  totalPages: number;
  last: boolean;
}>;

// Cache configuration - adjust TTL based on data freshness needs
const CACHE_MAX_AGE = 600; // 10 minutes
const STALE_WHILE_REVALIDATE = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "20";
    // Add more params as needed

    // Call external wrapper (handles HMAC signing)
    const data = await fetchRESOURCE_NAME({
      page: parseInt(page, 10),
      size: parseInt(size, 10),
      // Pass other params
    });

    // Return with cache headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      },
    });
  } catch (error) {
    console.error("[API] RESOURCE_NAME fetch error:", error);

    // Return safe fallback for read endpoints
    return NextResponse.json(
      { content: [], totalElements: 0, totalPages: 0, last: true },
      { status: 200 } // Don't fail - return empty data
    );
  }
}
