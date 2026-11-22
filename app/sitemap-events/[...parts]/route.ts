import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { buildSitemap } from "@utils/sitemap";
import type { SitemapField } from "types/sitemap";
import { buildAlternateLinks } from "@utils/i18n-seo";
import { isExpiredEventDates } from "@utils/event-helpers";
import { isMalformedEventSlug } from "@utils/event-slug-quality";
import { SITEMAP_EVENTS_PER_CHUNK } from "@utils/constants";

export async function GET(
  _request: Request,
  context: RouteContext<"/sitemap-events/[...parts]">
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
    size: SITEMAP_EVENTS_PER_CHUNK,
  });

  const events = response.content;

  if (!Array.isArray(events) || events.length === 0) {
    // Return 404 for out-of-range chunks (matches sitemap-places pattern)
    return new Response("<error>Chunk out of range</error>", {
      status: 404,
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Same rule as the page's robots tag (lib/meta.ts): an expired event is
  // noindexed there, so it must not be in the sitemap either.
  const now = new Date();

  const fields: SitemapField[] = events
    .filter((event) => !event.isAd)
    .filter((event) => !isMalformedEventSlug(event.slug))
    .filter((event) => !isExpiredEventDates(event, now))
    .map((data) => {
      // Only the event's own image; the site logo doesn't represent the event.
      const image = data.imageUrl;
      // Only a real edit date is a valid lastmod. The event date is in the
      // future for upcoming events, which Search Console flags as invalid.
      const updatedMs = data.updatedAt ? new Date(data.updatedAt).getTime() : NaN;
      const lastmod =
        Number.isNaN(updatedMs) || updatedMs > Date.now()
          ? undefined
          : new Date(updatedMs).toISOString();
      const loc = `${siteUrl}/e/${data.slug}`;
      return {
        loc,
        lastmod,
        image: image ? { loc: image } : undefined,
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
