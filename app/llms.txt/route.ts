import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader } from "@utils/cache";
import { siteUrl } from "@config/index";

export async function GET(request: NextRequest) {

  const lines: string[] = [
    "# llms.txt",
    `# Site: ${siteUrl}`,
    "# Purpose: Help LLM-based tools discover canonical URLs and high-signal content.",
    "# Updated: " + new Date().toISOString(),
    "",
    "## About (EN)",
    "Esdeveniments.cat is a multilingual (ca/es/en) events discovery site for Catalonia (Spain). It publishes up-to-date event listings by place, date and category, plus individual event detail pages and local news.",
    "",
    "## Sobre (CA)",
    "Esdeveniments.cat és una web multilingüe (ca/es/en) per descobrir esdeveniments i plans a Catalunya. Publica agendes per municipi/comarca, data i categoria, fitxes d’esdeveniments i notícies locals.",
    "",
    "## Sobre (ES)",
    "Esdeveniments.cat es una web multilingüe (ca/es/en) para descubrir eventos y planes en Cataluña. Publica agendas por municipio/comarca, fecha y categoría, fichas de eventos y noticias locales.",
    "",
    "## Languages / Locales",
    "- Default language: Catalan (ca) with no URL prefix.",
    "- Other supported locales: Spanish (es) and English (en) using locale prefixes when applicable:",
    `  - ${siteUrl}/es/...`,
    `  - ${siteUrl}/en/...`,
    "- For any page, prefer the canonical URL and use hreflang alternates when present.",
    "",
    "## Preferred canonical URL patterns",
    "- Home: /",
    "- Place agendas (canonical, URL-first filters): /{place}",
    "- Optional segments: /{place}/{date?}/{category?}",
    "  - Canonical omission rules: default values are omitted (avoid /tots in the path).",
    "- Event detail pages: /e/{eventIdOrSlug}",
    "- News: /noticies and /noticies/{slug}",
    "- Optional query params used for interactive filtering (may be non-canonical): search, distance, lat, lon",
    "",
    "## Primary discovery sources (Sitemaps)",
    `- ${siteUrl}/sitemap.xml (sitemap index)`,
    `- ${siteUrl}/server-static-sitemap.xml`,
    `- ${siteUrl}/server-sitemap.xml`,
    `- ${siteUrl}/server-news-sitemap.xml`,
    `- ${siteUrl}/server-place-sitemap.xml`,
    `- ${siteUrl}/server-google-news-sitemap.xml`,
    "",
    "## Crawling & policies",
    `- robots.txt: ${siteUrl}/robots.txt (crawler-specific rules)`,
    "- Content is intended for end-user discovery and answering queries.",
    "- For dataset creation or model training beyond normal indexing, please request permission.",
    "",
    "## Contact",
    `- ${siteUrl}/qui-som`,
  ];

  const llmsTxt = lines.join("\n");

  const cacheControl = getCacheControlHeader(request, 300);

  return new NextResponse(llmsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-LLMS-Source": "route-handler-v1",
    },
  });
}
