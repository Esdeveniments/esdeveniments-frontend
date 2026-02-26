import { siteUrl } from "@config/index";
import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";

export async function GET() {
  const profiles: SitemapField[] = [
    {
      loc: `${siteUrl}/perfil/razzmatazz`,
      lastmod: new Date().toISOString(),
      changefreq: "weekly",
      priority: 0.6,
    },
  ];

  const xml = buildSitemap(profiles);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
    status: 200,
  });
}
