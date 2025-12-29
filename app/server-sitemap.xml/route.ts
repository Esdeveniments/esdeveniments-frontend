import { siteUrl } from "@config/index";
import { buildSitemapIndex } from "@utils/sitemap";

export async function GET() {
  // Sitemap index: references chunked event sitemaps to avoid 6MB Lambda payload limit
  // Each chunk handles 500 events (see sitemap-events route)
  // Adjust CHUNKS based on expected total event count (~2500 events = 5 chunks)
  const CHUNKS = 5;

  const sitemaps = Array.from(
    { length: CHUNKS },
    (_, i) => `${siteUrl}/sitemap-events/${i + 1}.xml`
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
