import { getSiteUrlFromRequest } from "@config/index";
import { buildSitemapIndex, sitemapChunkUrls } from "@utils/sitemap";
import {
  fetchEventSitemapChunkCount,
  fetchPlaceSitemapChunkCount,
} from "@lib/seo/sitemap-chunks";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Get site URL from request (prefers request host, falls back to env-based detection)
  const siteUrl = getSiteUrlFromRequest(request);
  const [eventChunks, placeChunks] = await Promise.all([
    fetchEventSitemapChunkCount(),
    fetchPlaceSitemapChunkCount(),
  ]);

  // Sitemap indexes can't nest, so this one lists the chunked sitemaps
  // directly instead of the server-sitemap/server-place-sitemap indexes.
  const sitemapUrls = [
    `${siteUrl}/server-static-sitemap.xml`,
    `${siteUrl}/server-festa-major-sitemap.xml`,
    ...sitemapChunkUrls(siteUrl, "sitemap-events", eventChunks),
    ...sitemapChunkUrls(siteUrl, "sitemap-places", placeChunks),
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
