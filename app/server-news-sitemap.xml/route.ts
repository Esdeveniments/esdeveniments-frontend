import { siteUrl } from "@config/index";
import { fetchNews } from "@lib/api/news";
import { buildSitemap } from "@utils/sitemap";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import type { SitemapField } from "types/sitemap";
import { buildAlternateLinks } from "@utils/i18n-seo";

// Newest articles across every city (the API sorts by startDate, newest first).
const ARTICLE_LIMIT = 100;

export async function GET() {
  const res = await fetchNews({ page: 0, size: ARTICLE_LIMIT });
  const items = Array.isArray(res.content) ? res.content : [];

  // No <lastmod>: the list API has no publish or edit date, and Google ignores
  // a lastmod that isn't accurate (an article's event dates aren't edit dates).
  const places = new Set<string>();
  const articleEntries: SitemapField[] = [];
  for (const item of items) {
    if (!item.slug) continue;
    const place = resolveNewsItemPlace(item, "catalunya", "").slug;
    places.add(place);
    const loc = `${siteUrl}/noticies/${place}/${item.slug}`;
    articleEntries.push({ loc, alternates: buildAlternateLinks(loc) });
  }

  const placeEntries: SitemapField[] = [...places].map((place) => {
    const loc = `${siteUrl}/noticies/${place}`;
    return { loc, alternates: buildAlternateLinks(loc) };
  });

  const xml = buildSitemap([...placeEntries, ...articleEntries], {});
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
