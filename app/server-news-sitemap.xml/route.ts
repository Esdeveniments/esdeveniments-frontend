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

  // Fetch recent articles per hub IN PARALLEL. Sequential awaits blew past the
  // 60s build-export limit when the API was slow. NEWS_HUBS is small, so an
  // unbounded Promise.all is fine — add a concurrency cap if it ever grows.
  const perHub = await Promise.all(
    NEWS_HUBS.map(async (hub) => {
      try {
        const res = await fetchNews({ page: 0, size: 20, place: hub.slug });
        return (Array.isArray(res.content) ? res.content : []).map((item) => ({
          hub,
          item,
        }));
      } catch (e) {
        // Continue gracefully on a hub failure
        console.error(
          "server-news-sitemap: error fetching news for hub",
          hub.slug,
          e
        );
        return [];
      }
    })
  );

  for (const { hub, item } of perHub.flat()) {
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

  const xml = buildSitemap([...listEntries, ...articleEntries], {});
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
