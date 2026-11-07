import { getSiteUrlFromRequest } from "@config/index";
import { buildSitemap } from "@utils/sitemap";
import { NextRequest } from "next/server";
import { SitemapField } from "types/sitemap";
import { buildAlternateLinks } from "@utils/i18n-seo";

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrlFromRequest(request);
  // No lastmod: these pages have no real edit date, and "now" on every
  // request teaches crawlers to ignore it.
  // Define static pages here
  // This replaces the automatic detection from next-sitemap
  const staticPages: SitemapField[] = [
    {
      loc: `${siteUrl}`,
      alternates: buildAlternateLinks(`${siteUrl}/`),
    },
    {
      loc: `${siteUrl}/sitemap`, // Arxiu
      alternates: buildAlternateLinks(`${siteUrl}/sitemap`),
    },
    {
      loc: `${siteUrl}/noticies`,
      alternates: buildAlternateLinks(`${siteUrl}/noticies`),
    },
    {
      loc: `${siteUrl}/publica`,
      alternates: buildAlternateLinks(`${siteUrl}/publica`),
    },
    {
      loc: `${siteUrl}/qui-som`,
      alternates: buildAlternateLinks(`${siteUrl}/qui-som`),
    },
    ...["/developers", "/developers/mcp"].map((path) => ({
      loc: `${siteUrl}${path}`,
      alternates: buildAlternateLinks(`${siteUrl}${path}`),
    })),
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
