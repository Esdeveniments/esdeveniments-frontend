import { siteUrl } from "@config/index";
import { fetchPlaces } from "@lib/api/places";
import { fetchCategories } from "@lib/api/categories";
import { VALID_DATES } from "@lib/dates";
import { highPrioritySlugs } from "@utils/priority-places";
import { buildCanonicalUrlDynamic } from "@utils/url-filters";

function buildSitemap(
  fields: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }>
): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    fields
      .map((field) => {
        return (
          `  <url>\n` +
          `    <loc>${field.loc}</loc>\n` +
          `    <lastmod>${field.lastmod}</lastmod>\n` +
          `    <changefreq>${field.changefreq}</changefreq>\n` +
          `    <priority>${field.priority}</priority>\n` +
          `  </url>`
        );
      })
      .join("\n") +
    `\n</urlset>`
  );
}

export async function GET() {
  const [places, categories] = await Promise.all([
    fetchPlaces(),
    fetchCategories(),
  ]);

  const filteredHighPrioritySlugs = highPrioritySlugs.filter((slug) =>
    places.some((place) => place.slug === slug)
  );

  if (!Array.isArray(places)) {
    return new Response("<error>places is not an array</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }

  if (!Array.isArray(categories)) {
    return new Response("<error>categories is not an array</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Top dates and categories (similar to static generation)
  const topDates = VALID_DATES.filter((date) => date !== "tots");
  const topCategories = categories
    .slice(0, 5)
    .map((cat) => cat.slug)
    .filter((slug) => slug && slug !== "tots");

  const fields: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }> = [];

  const lastmod = new Date().toISOString();

  // Generate URLs for each place
  for (const place of places) {
    // /[place]
    fields.push({
      loc: `${siteUrl}${buildCanonicalUrlDynamic(
        { place: place.slug },
        categories
      )}`,
      lastmod: lastmod,
      changefreq: "daily",
      priority: filteredHighPrioritySlugs.includes(place.slug) ? 0.9 : 0.6,
    });

    // /[place]/[date]
    for (const date of topDates) {
      fields.push({
        loc: `${siteUrl}${buildCanonicalUrlDynamic(
          { place: place.slug, byDate: date },
          categories
        )}`,
        lastmod: lastmod,
        changefreq: "daily",
        priority: 0.7,
      });

      // /[place]/[date]/[category]
      for (const category of topCategories) {
        fields.push({
          loc: `${siteUrl}${buildCanonicalUrlDynamic(
            { place: place.slug, byDate: date, category },
            categories
          )}`,
          lastmod: lastmod,
          changefreq: "daily",
          priority: 0.6,
        });
      }
    }

    // /[place]/[category] (when date is "tots" but omitted in URL)
    for (const category of topCategories) {
      if (category !== "tots") {
        fields.push({
          loc: `${siteUrl}${buildCanonicalUrlDynamic(
            { place: place.slug, category },
            categories
          )}`,
          lastmod: lastmod,
          changefreq: "daily",
          priority: 0.7,
        });
      }
    }
  }

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
