import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO } from "types/api/event";
import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";
import { buildAlternateLinks } from "@utils/i18n-seo";
import { EXPIRED_EVENT_NOINDEX_DAYS } from "@lib/meta";
import type { SitemapPartsRouteContext } from "types/props";

// Chunk size chosen to keep response sizes manageable
// With image URLs and hreflang alternates, ~500 events per chunk is safe
const EVENTS_PER_CHUNK = 500;

export async function GET(
  _request: Request,
  context: SitemapPartsRouteContext
) {
  const { parts } = await context.params;

  // Expected URL: /sitemap-events/1.xml, /sitemap-events/2.xml, etc.
  if (!parts || parts.length !== 1) {
    return new Response("<error>Invalid URL format</error>", {
      status: 400,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const slug = parts[0];
  const match = slug.match(/^(\d+)\.xml$/);
  if (!match) {
    return new Response("<error>Invalid URL format. Expected N.xml</error>", {
      status: 400,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const chunkNumber = parseInt(match[1], 10);

  if (isNaN(chunkNumber) || chunkNumber < 1) {
    return new Response("<error>Invalid chunk number</error>", {
      status: 400,
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Fetch events for this chunk (0-indexed pages)
  const response = await fetchEvents({
    page: chunkNumber - 1,
    size: EVENTS_PER_CHUNK,
  });

  const events = response.content;

  if (!Array.isArray(events) || events.length === 0) {
    // Return 404 for out-of-range chunks (matches sitemap-places pattern)
    return new Response("<error>Chunk out of range</error>", {
      status: 404,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const normalizedEvents = JSON.parse(
    JSON.stringify(events)
  ) as EventSummaryResponseDTO[];

  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;

  // Keep sitemap aligned with on-page robots policy: events older than
  // EXPIRED_EVENT_NOINDEX_DAYS are noindex'd in lib/meta.ts, so excluding
  // them from the sitemap prevents signal conflicts and preserves sitemap
  // trust. Events without a resolvable end date are kept (edge case).
  const expiredCutoffMs = Date.now() - EXPIRED_EVENT_NOINDEX_DAYS * 24 * 60 * 60 * 1000;

  const fields: SitemapField[] = normalizedEvents
    .filter((event) => !event.isAd)
    .filter((event) => {
      const end = event.endDate || event.startDate;
      if (!end) return true;
      const endTime = new Date(end).getTime();
      if (Number.isNaN(endTime)) return true;
      return endTime > expiredCutoffMs;
    })
    .map((data) => {
      const image = data.imageUrl || defaultImage;
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
        alternates: buildAlternateLinks(loc),
      };
    });

  const xml = buildSitemap(fields, { includeImage: true });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
