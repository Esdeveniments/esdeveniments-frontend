import { sanitize } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO } from "types/api/event";

function buildSitemap(
  fields: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
    image?: { loc: string; title: string };
  }>
): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    fields
      .map((field) => {
        return (
          `  <url>\n` +
          `    <loc>${field.loc}</loc>\n` +
          `    <lastmod>${field.lastmod}</lastmod>\n` +
          `    <changefreq>${field.changefreq}</changefreq>\n` +
          `    <priority>${field.priority}</priority>\n` +
          (field.image
            ? `    <image:image>\n      <image:loc>${
                field.image.loc
              }</image:loc>\n      <image:title>${sanitize(
                field.image.title
              )}</image:title>\n    </image:image>\n`
            : "") +
          `  </url>`
        );
      })
      .join("\n") +
    `\n</urlset>`
  );
}

export async function GET() {
  // Removed date filtering - new API doesn't support it

  const response = await fetchEvents({
    page: 0,
    size: 2500,
  });

  const events = response.content;

  if (!Array.isArray(events)) {
    return new Response("<error>events is not an array</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const normalizedEvents = JSON.parse(
    JSON.stringify(events)
  ) as EventSummaryResponseDTO[];

  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;

  const fields = normalizedEvents
    .filter((event) => !event.isAd)
    .map((data) => {
      const image = data.imageUrl || defaultImage;
      return {
        loc: `${siteUrl}/e/${data.slug}`,
        lastmod: new Date(
          data.endDate || data.startDate || Date.now()
        ).toISOString(),
        changefreq: "daily",
        priority: 0.7,
        image: image ? { loc: image, title: data.title } : undefined,
      };
    });

  const xml = buildSitemap(fields);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
