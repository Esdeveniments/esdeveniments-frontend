import { siteUrl } from "@config/index";
import { NEWS_HUBS } from "@utils/constants";
import { fetchNews } from "@lib/api/news";
import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";
import { buildAlternateLinks } from "@utils/i18n-seo";

export async function GET() {
  // Include news list pages and a rolling window of article detail URLs per hub
  const listEntries: SitemapField[] = NEWS_HUBS.map((hub) => {
    const loc = `${siteUrl}/noticies/${hub.slug}`;
    return {
      loc,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 0.6,
      alternates: buildAlternateLinks(loc),
    };
  });

  const articleEntries: SitemapField[] = [];

  // Fetch a limited number of recent articles per hub to avoid oversized sitemap
  for (const hub of NEWS_HUBS) {
    try {
      const res = await fetchNews({ page: 0, size: 20, place: hub.slug });
      const items = Array.isArray(res.content) ? res.content : [];
      for (const item of items) {
        const lastDate = item.endDate || item.startDate;
        if (!item.slug || !lastDate) continue;
        const loc = `${siteUrl}/noticies/${hub.slug}/${item.slug}`;
        articleEntries.push({
          loc,
          lastmod: new Date(lastDate).toISOString(),
          changefreq: "daily",
          priority: 0.7,
          alternates: buildAlternateLinks(loc),
        });
      }
    } catch (e) {
      // Continue gracefully on a hub failure
      console.error(
        "server-news-sitemap: error fetching news for hub",
        hub.slug,
        e
      );
    }
  }

  const xml = buildSitemap([...listEntries, ...articleEntries], {});
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
