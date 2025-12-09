import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO } from "types/api/event";
import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";
import { buildLocalizedUrls } from "@utils/i18n-seo";
import {
  DEFAULT_LOCALE,
  localeToHrefLang,
  type AppLocale,
} from "types/i18n";

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

  const toAlternates = (loc: string): Record<string, string> => {
    const url = new URL(loc);
    const localized = buildLocalizedUrls(url.pathname);
    const alternates: Record<string, string> = {};
    Object.entries(localized).forEach(([locale, href]) => {
      const hrefLang = localeToHrefLang[locale as AppLocale] ?? locale;
      alternates[hrefLang] = href;
    });
    if (localized[DEFAULT_LOCALE]) {
      alternates["x-default"] = localized[DEFAULT_LOCALE];
    }
    return alternates;
  };

  const fields: SitemapField[] = normalizedEvents
    .filter((event) => !event.isAd)
    .map((data) => {
      const image = data.imageUrl || defaultImage;
      // Use event's updatedAt if available, otherwise fall back to endDate || startDate
      let lastModDate = data.updatedAt
        ? new Date(data.updatedAt)
        : new Date(data.endDate || data.startDate);
      if (isNaN(lastModDate.getTime())) {
        lastModDate = new Date();
      }
      const loc = `${siteUrl}/e/${data.slug}`;
      return {
        loc,
        lastmod: lastModDate.toISOString(),
        changefreq: "daily",
        priority: 0.7,
        image: image ? { loc: image, title: data.title } : undefined,
        alternates: toAlternates(loc),
      };
    });

  const xml = buildSitemap(fields, { includeImage: true });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
