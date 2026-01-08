import { siteUrl } from "@config/index";
import { fetchPlaces } from "@lib/api/places";
import { buildSitemapIndex } from "@utils/sitemap";
import { SITEMAP_PLACES_PER_CHUNK } from "@utils/constants";

export async function GET() {
  // Sitemap index: references chunked place sitemaps to avoid 6MB Lambda payload limit
  // Each chunk handles a subset of places × dates × categories
  const places = await fetchPlaces();
  const totalChunks = Math.ceil(places.length / SITEMAP_PLACES_PER_CHUNK);

  const sitemaps = Array.from(
    { length: totalChunks },
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
