import { siteUrl } from "@config/index";
import { buildSitemapIndex } from "@utils/sitemap";

export async function GET() {
  // Sitemap index: references chunked place sitemaps to avoid 6MB Lambda payload limit
  // Each chunk handles a subset of places × dates × categories
  const CHUNKS = 5; // Adjust based on total place count
  
  const sitemaps = Array.from(
    { length: CHUNKS },
    (_, i) => `${siteUrl}/sitemap-places/${i + 1}.xml`
  );

  const xml = buildSitemapIndex(sitemaps);


  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
