import { siteUrl } from "@config/index";
import { buildSitemapIndex, sitemapChunkUrls } from "@utils/sitemap";
import { fetchPlaceSitemapChunkCount } from "@lib/seo/sitemap-chunks";

// Legacy index of the place chunks; robots.txt points to /sitemap.xml, which
// lists them too. Kept because Search Console may still have it submitted.
export async function GET() {
  const chunks = await fetchPlaceSitemapChunkCount();
  const xml = buildSitemapIndex(sitemapChunkUrls(siteUrl, "sitemap-places", chunks));

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
