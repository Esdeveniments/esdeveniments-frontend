import { getSiteUrlFromRequest } from "@config/index";
import { buildSitemapIndex } from "@utils/sitemap";
import { NextRequest } from "next/server";

// Chunk counts must match the corresponding sitemap routes
const EVENT_CHUNKS = 5; // Matches server-sitemap.xml
const PLACE_CHUNKS = 5; // Matches server-place-sitemap.xml

export async function GET(request: NextRequest) {
  // Get site URL from request (prefers request host, falls back to env-based detection)
  const siteUrl = getSiteUrlFromRequest(request);

  // Build sitemap index referencing all sitemaps
  // IMPORTANT: Sitemap indexes cannot reference other sitemap indexes (nested indexes not allowed)
  // So we reference the chunked sitemaps directly instead of the index routes
  const sitemapUrls = [
    `${siteUrl}/server-static-sitemap.xml`, // Static pages
    // Event sitemaps (chunked to stay under 6MB Lambda limit)
    ...Array.from(
      { length: EVENT_CHUNKS },
      (_, i) => `${siteUrl}/sitemap-events/${i + 1}.xml`
    ),
    // Place sitemaps (chunked to stay under 6MB Lambda limit)
    ...Array.from(
      { length: PLACE_CHUNKS },
      (_, i) => `${siteUrl}/sitemap-places/${i + 1}.xml`
    ),
    `${siteUrl}/server-news-sitemap.xml`,
    `${siteUrl}/server-google-news-sitemap.xml`,
  ];

  const xml = buildSitemapIndex(sitemapUrls);

  // Check for cache-busting query parameter (e.g., ?v=2 or ?nocache=1)
  // Safely handle cases where searchParams might be undefined (e.g., in tests)
  const searchParams = request.nextUrl.searchParams;
  const hasCacheBust = searchParams?.has("v") || searchParams?.has("nocache");

  // Reduced cache TTL: 5 minutes at edge, no stale-while-revalidate to prevent serving old content
  // If cache-busting is requested, disable caching entirely
  const cacheControl = hasCacheBust
    ? "no-cache, no-store, must-revalidate"
    : "public, s-maxage=300, stale-while-revalidate=0";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": cacheControl,
    },
    status: 200,
  });
}
