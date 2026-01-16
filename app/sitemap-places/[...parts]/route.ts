import { siteUrl } from "@config/index";
import { fetchPlaces } from "@lib/api/places";
import { fetchCategories } from "@lib/api/categories";
import { VALID_DATES } from "@lib/dates";
import { highPrioritySlugs } from "@utils/priority-places";
import { buildCanonicalUrlDynamic } from "@utils/url-filters";
import { buildSitemap } from "@utils/sitemap";
import { DEFAULT_FILTER_VALUE, SITEMAP_PLACES_PER_CHUNK } from "@utils/constants";
import type { SitemapField } from "types/sitemap";
import type { SitemapPartsRouteContext } from "types/props";
import { buildAlternateLinks } from "@utils/i18n-seo";

export async function GET(_request: Request, context: SitemapPartsRouteContext) {
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

  const TOP_CATEGORIES_COUNT = 5;

  const [places, categories] = await Promise.all([
    fetchPlaces(),
    fetchCategories(),
  ]);

  const placeSlugs = new Set(places.map((p) => p.slug));
  const filteredHighPrioritySlugs = highPrioritySlugs.filter((placeSlug) =>
    placeSlugs.has(placeSlug)
  );

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
    .slice(0, TOP_CATEGORIES_COUNT)
    .map((cat) => cat.slug)
    .filter((catSlug) => catSlug && catSlug !== DEFAULT_FILTER_VALUE);

  const fields: SitemapField[] = [];
  const lastmod = new Date().toISOString();

  // Generate URLs for each place in this chunk
  for (const place of chunkPlaces) {
    // /[place]
    const placeLoc = `${siteUrl}${buildCanonicalUrlDynamic(
      { place: place.slug },
      categories
    )}`;
    fields.push({
      loc: placeLoc,
      lastmod: lastmod,
      changefreq: "daily",
      priority: filteredHighPrioritySlugs.includes(place.slug) ? 0.9 : 0.6,
      alternates: buildAlternateLinks(placeLoc),
    });

    // /[place]/[date]
    for (const date of topDates) {
      const dateLoc = `${siteUrl}${buildCanonicalUrlDynamic(
        { place: place.slug, byDate: date },
        categories
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
          categories
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
      if (category !== DEFAULT_FILTER_VALUE) {
        const catLoc = `${siteUrl}${buildCanonicalUrlDynamic(
          { place: place.slug, category },
          categories
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
  }

  const xml = buildSitemap(fields, {});
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
