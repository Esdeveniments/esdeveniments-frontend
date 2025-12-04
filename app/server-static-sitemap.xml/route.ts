import { getSiteUrlFromRequest } from "@config/index";
import { buildSitemap } from "@utils/sitemap";
import { NextRequest } from "next/server";
import { SitemapField } from "types/sitemap";

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrlFromRequest(request);
  const lastmod = new Date().toISOString();

  // Define static pages here
  // This replaces the automatic detection from next-sitemap
  const staticPages: SitemapField[] = [
    {
      loc: `${siteUrl}`,
      lastmod,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${siteUrl}/sitemap`, // Arxiu
      lastmod,
      changefreq: "daily",
      priority: 0.7,
    },
    {
      loc: `${siteUrl}/noticies`,
      lastmod,
      changefreq: "daily",
      priority: 0.7,
    },
    {
      loc: `${siteUrl}/publica`,
      lastmod,
      changefreq: "daily",
      priority: 0.7,
    },
    {
      loc: `${siteUrl}/qui-som`,
      lastmod,
      changefreq: "daily",
      priority: 0.7,
    },
  ];

  const xml = buildSitemap(staticPages);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 1 day (86400s) since static pages change rarely
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
