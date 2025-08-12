import { siteUrl } from "@config/index";
import { NEWS_HUBS } from "@utils/constants";
import { fetchNews } from "@lib/api/news";

type UrlField = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
};

function buildSitemap(fields: UrlField[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    fields
      .map((field) => {
        return (
          `  <url>\n` +
          `    <loc>${field.loc}</loc>\n` +
          `    <lastmod>${field.lastmod}</lastmod>\n` +
          `    <changefreq>${field.changefreq}</changefreq>\n` +
          `    <priority>${field.priority}</priority>\n` +
          `  </url>`
        );
      })
      .join("\n") +
    `\n</urlset>`
  );
}

export async function GET() {
  // Include news list pages and a rolling window of article detail URLs per hub
  const listEntries: UrlField[] = NEWS_HUBS.map((hub) => ({
    loc: `${siteUrl}/noticies/${hub.slug}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.6,
  }));

  const articleEntries: UrlField[] = [];

  // Fetch a limited number of recent articles per hub to avoid oversized sitemap
  for (const hub of NEWS_HUBS) {
    try {
      const res = await fetchNews({ page: 0, size: 20, place: hub.slug });
      const items = Array.isArray(res.content) ? res.content : [];
      for (const item of items) {
        const lastDate = item.endDate || item.startDate;
        if (!item.slug || !lastDate) continue;
        articleEntries.push({
          loc: `${siteUrl}/noticies/${hub.slug}/${item.slug}`,
          lastmod: new Date(lastDate).toISOString(),
          changefreq: "daily",
          priority: 0.7,
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

  const xml = buildSitemap([...listEntries, ...articleEntries]);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
