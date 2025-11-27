import { siteUrl } from "@config/index";
import { NEWS_HUBS } from "@utils/constants";
import { fetchNews, fetchNewsBySlug } from "@lib/api/news";

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
      return (
        `  <url>\n` +
        `    <loc>${i.loc}</loc>\n` +
        `    <news:news>\n` +
        `      <news:publication>\n` +
        `        <news:name>${i.publicationName}</news:name>\n` +
        `        <news:language>${i.language}</news:language>\n` +
        `      </news:publication>\n` +
        `      <news:publication_date>${i.publicationDate}</news:publication_date>\n` +
        `      <news:title>${i.title}</news:title>\n` +
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
        candidates.push({
          loc: `${siteUrl}/noticies/${hub.slug}/${item.slug}`,
          publicationName: "Esdeveniments.cat",
          language: "ca",
          title: detail.title,
          publicationDate: new Date(pubMs).toISOString(),
        });
      }
    } catch (e) {
      console.error("google-news-sitemap: error fetching hub", hub.slug, e);
    }
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
