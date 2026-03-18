import { siteUrl } from "@config/index";
import { fetchPlaces } from "@lib/api/places";
import { fetchCategories } from "@lib/api/categories";
import { fetchEventCountExternal } from "@lib/api/events-external";
import { VALID_DATES } from "@lib/dates";
import { buildCanonicalUrlDynamic } from "@utils/url-filters";
import { buildSitemap } from "@utils/sitemap";
import {
  DEFAULT_FILTER_VALUE,
  SITEMAP_PLACES_PER_CHUNK,
  SITEMAP_MIN_EVENTS_FOR_EXPANSION,
  SITEMAP_TOP_CATEGORIES_COUNT,
} from "@utils/constants";
import type { SitemapField } from "types/sitemap";
import type { SitemapPartsRouteContext } from "types/props";
import type { PlaceResponseDTO } from "types/api/place";
import { buildAlternateLinks } from "@utils/i18n-seo";

/**
 * Dynamically determines which places have enough content for full sitemap expansion.
 * REGIONs always expand (they aggregate city events, always have content).
 * CITYs expand only if they have enough events (>= SITEMAP_MIN_EVENTS_FOR_EXPANSION).
 * This avoids submitting thin/empty filtered pages that waste crawl budget.
 */
async function getExpandablePlaces(
  places: PlaceResponseDTO[],
): Promise<Set<string>> {
  const BATCH_SIZE = 10;
  const results: { slug: string; expandable: boolean }[] = [];

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (place) => {
        // REGIONs always qualify — they aggregate events from all cities in the region
        if (place.type === "REGION") {
          return { slug: place.slug, expandable: true };
        }
        try {
          // Returns null on API failure, real count (≥0) on success.
          // null → expand by default so transient failures don't shrink the sitemap.
          const count = await fetchEventCountExternal(place.slug);
          return {
            slug: place.slug,
            expandable:
              count === null || count >= SITEMAP_MIN_EVENTS_FOR_EXPANSION,
          };
        } catch {
          // Expand on unexpected error to avoid collapsing sitemap on failures
          return { slug: place.slug, expandable: true };
        }
      }),
    );
    results.push(...batchResults);
  }

  return new Set(
    results.filter(({ expandable }) => expandable).map(({ slug }) => slug),
  );
}

export async function GET(
  _request: Request,
  context: SitemapPartsRouteContext,
) {
  const { parts } = await context.params;

  // Expected URL: /sitemap-places/1.xml, /sitemap-places/2.xml, etc.
  // parts = ["1.xml"], ["2.xml"], etc.
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

  const [places, categories] = await Promise.all([
    fetchPlaces(),
    fetchCategories(),
  ]);

  // Chunk places: chunk 1 → places 0-99, chunk 2 → places 100-199, etc.
  const startIndex = (chunkNumber - 1) * SITEMAP_PLACES_PER_CHUNK;
  const endIndex = startIndex + SITEMAP_PLACES_PER_CHUNK;
  const chunkPlaces = places.slice(startIndex, endIndex);

  if (chunkPlaces.length === 0) {
    return new Response("<error>Chunk out of range</error>", {
      status: 404,
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Top dates and categories (similar to static generation)
  const topDates = VALID_DATES.filter((date) => date !== DEFAULT_FILTER_VALUE);
  const topCategories = categories
    .slice(0, SITEMAP_TOP_CATEGORIES_COUNT)
    .map((cat) => cat.slug)
    .filter((catSlug) => catSlug && catSlug !== DEFAULT_FILTER_VALUE);

  // Dynamically determine which places have enough content for full expansion.
  // This replaces the static highPrioritySlugs list — adapts automatically
  // as event data changes across places.
  const expandableSlugs = await getExpandablePlaces(chunkPlaces);

  const fields: SitemapField[] = [];
  // Stable daily timestamp so crawlers don't think every URL changes per-request
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastmod = today.toISOString();

  for (const place of chunkPlaces) {
    const shouldExpand = expandableSlugs.has(place.slug);

    // /[place] — always included for all places
    const placeLoc = `${siteUrl}${buildCanonicalUrlDynamic(
      { place: place.slug },
      categories,
    )}`;
    fields.push({
      loc: placeLoc,
      lastmod: lastmod,
      changefreq: "daily",
      priority: shouldExpand ? 0.9 : 0.6,
      alternates: buildAlternateLinks(placeLoc),
    });

    // Date and category combos only for places with real content depth
    if (!shouldExpand) continue;

    // /[place]/[date]
    for (const date of topDates) {
      const dateLoc = `${siteUrl}${buildCanonicalUrlDynamic(
        { place: place.slug, byDate: date },
        categories,
      )}`;
      fields.push({
        loc: dateLoc,
        lastmod: lastmod,
        changefreq: "daily",
        priority: 0.7,
        alternates: buildAlternateLinks(dateLoc),
      });

      // /[place]/[date]/[category]
      for (const category of topCategories) {
        const dateCatLoc = `${siteUrl}${buildCanonicalUrlDynamic(
          { place: place.slug, byDate: date, category },
          categories,
        )}`;
        fields.push({
          loc: dateCatLoc,
          lastmod: lastmod,
          changefreq: "daily",
          priority: 0.6,
          alternates: buildAlternateLinks(dateCatLoc),
        });
      }
    }

    // /[place]/[category] (when date is "tots" but omitted in URL)
    for (const category of topCategories) {
      const catLoc = `${siteUrl}${buildCanonicalUrlDynamic(
        { place: place.slug, category },
        categories,
      )}`;
      fields.push({
        loc: catLoc,
        lastmod: lastmod,
        changefreq: "daily",
        priority: 0.7,
        alternates: buildAlternateLinks(catLoc),
      });
    }
  }

  const xml = buildSitemap(fields, {});
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
