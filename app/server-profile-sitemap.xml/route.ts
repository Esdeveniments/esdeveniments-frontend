import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";

// TODO(backend): emit one entry per registered username once the backend
// exposes a public user index endpoint. Until then we ship an empty
// urlset rather than a hardcoded sample profile.
export async function GET() {
  const profiles: SitemapField[] = [];
  const xml = buildSitemap(profiles);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
