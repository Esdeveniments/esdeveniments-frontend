import { siteUrl } from "@config/index";
import { fetchNews, fetchNewsBySlug } from "@lib/api/news";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import {
  SUPPORTED_LOCALES,
  localeToHrefLang,
  type AppLocale,
} from "types/i18n";
import { buildLocalizedUrls } from "@utils/i18n-seo";
import { escapeXml } from "@utils/xml-escape";

// Google News sitemaps list only articles from the last 2 days, so this is
// often empty. Google's docs say an empty news sitemap is fine (Search Console
// shows a harmless "Empty Sitemap" warning), so it always returns 200; a 404
// shows up as an error on the /sitemap.xml index.
// https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap

function buildNewsSitemap(
  items: {
    loc: string;
    publicationName: string;
    language: string;
    title: string;
    publicationDate: string;
  }[]
): string {
  const header =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;
  const urls = items
    .map((i) => {
      // Use publicationDate for lastmod (ISO 8601 format)
      const lastmod = i.publicationDate;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(i.loc)}</loc>\n` +
        `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` +
        `    <news:news>\n` +
        `      <news:publication>\n` +
        `        <news:name>${escapeXml(i.publicationName)}</news:name>\n` +
        `        <news:language>${escapeXml(i.language)}</news:language>\n` +
        `      </news:publication>\n` +
        `      <news:publication_date>${escapeXml(i.publicationDate)}</news:publication_date>\n` +
        `      <news:title>${escapeXml(i.title)}</news:title>\n` +
        `    </news:news>\n` +
        `  </url>`
      );
    })
    .join("\n");
  return `${header}${urls}\n</urlset>`;
}

export async function GET() {
  const now = Date.now();
  const cutoffMs = 48 * 60 * 60 * 1000; // 48 hours
  const candidates: {
    loc: string;
    publicationName: string;
    language: string;
    title: string;
    publicationDate: string;
  }[] = [];

  // The API sorts by startDate, newest first, and articles are written just
  // before the dates they cover, so anything from the last 48 hours is in the
  // first page. The list has no publish time, so each detail is fetched,
  // DETAIL_CONCURRENCY at a time to stay gentle on the API.
  const DETAIL_CONCURRENCY = 5;
  const res = await fetchNews({ page: 0, size: 20 });
  const items = Array.isArray(res.content) ? res.content : [];
  const resolved: {
    item: (typeof items)[number];
    detail: Awaited<ReturnType<typeof fetchNewsBySlug>>;
  }[] = [];
  for (let i = 0; i < items.length; i += DETAIL_CONCURRENCY) {
    const chunk = items.slice(i, i + DETAIL_CONCURRENCY);
    resolved.push(
      ...(await Promise.all(
        chunk.map(async (item) => ({
          item,
          detail: await fetchNewsBySlug(item.slug),
        }))
      ))
    );
  }

  for (const { item, detail } of resolved) {
    if (!detail || !detail.createdAt) continue;
    const pubMs = Date.parse(detail.createdAt);
    if (isNaN(pubMs) || now - pubMs > cutoffMs) continue;
    const place = resolveNewsItemPlace(item, "catalunya", "").slug;
    const basePath = `/noticies/${place}/${item.slug}`;
    const localizedUrls = buildLocalizedUrls(basePath);

    SUPPORTED_LOCALES.forEach((locale) => {
      const loc = localizedUrls[locale] ?? `${siteUrl}${basePath}`;
      candidates.push({
        loc,
        publicationName: "Esdeveniments.cat",
        language: localeToHrefLang[locale as AppLocale] ?? locale,
        title: detail.title,
        publicationDate: new Date(pubMs).toISOString(),
      });
    });
  }

  const xml = buildNewsSitemap(candidates);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
