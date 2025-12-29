import { siteUrl } from "@config/index";
import { NEWS_HUBS } from "@utils/constants";
import { fetchNews, fetchNewsBySlug } from "@lib/api/news";
import {
  SUPPORTED_LOCALES,
  localeToHrefLang,
  type AppLocale,
} from "types/i18n";
import { buildLocalizedUrls } from "@utils/i18n-seo";
import { escapeXml } from "@utils/xml-escape";

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
        `    <changefreq>daily</changefreq>\n` +
        `    <priority>0.8</priority>\n` +
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

  for (const hub of NEWS_HUBS) {
    try {
      const res = await fetchNews({ page: 0, size: 20, place: hub.slug });
      const items = Array.isArray(res.content) ? res.content : [];
      for (const item of items) {
        // Fetch detail to get accurate publication datetime
        const detail = await fetchNewsBySlug(item.slug);
        if (!detail || !detail.createdAt) continue;
        const pubMs = Date.parse(detail.createdAt);
        if (isNaN(pubMs) || now - pubMs > cutoffMs) continue;
        const basePath = `/noticies/${hub.slug}/${item.slug}`;
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
    } catch (e) {
      console.error("google-news-sitemap: error fetching hub", hub.slug, e);
    }
  }

  // Google News sitemaps must contain at least one URL
  // Return 404 when there are no candidates to avoid invalid XML
  // This is semantically correct: the sitemap doesn't exist when there's no content
  if (candidates.length === 0) {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
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
