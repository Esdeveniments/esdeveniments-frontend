import { getSiteUrlFromRequest } from "@config/index";
import { FESTIVITY_SLUGS } from "@config/festivities";
import { fetchFestaMajorCalendar } from "@lib/api/festes-majors";
import { fetchFestivityPage } from "@lib/api/festivities";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { indexableHubPaths } from "@utils/festa-major-calendar";
import { indexableFestivityPaths } from "@utils/festivity";
import { buildAlternateLinks } from "@utils/i18n-seo";
import { buildSitemap } from "@utils/sitemap";
import { NextRequest } from "next/server";

/**
 * The festa major calendar, every hub and every Nadal collection
 * (/fires-de-nadal, …) that passes its indexing gate, so the sitemap never
 * lists a noindex page. No lastmod: the hubs have no real
 * edit date.
 */
export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrlFromRequest(request);
  const [calendar, festivities] = await Promise.all([
    fetchFestaMajorCalendar(),
    Promise.all(FESTIVITY_SLUGS.map((slug) => fetchFestivityPage(slug))),
  ]);
  const complete = calendar !== null && festivities.every((p) => p.available);
  const paths = [
    `/${FESTES_MAJORS_SEGMENT}`,
    ...(calendar ? indexableHubPaths(calendar) : []),
    ...indexableFestivityPaths(festivities),
  ];
  const xml = buildSitemap(
    paths.map((path) => ({
      loc: `${siteUrl}${path}`,
      alternates: buildAlternateLinks(`${siteUrl}${path}`),
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // A backend blip must not drop the hubs for a whole day.
      "Cache-Control": complete
        ? "public, s-maxage=21600, stale-while-revalidate=86400"
        : "public, s-maxage=300, stale-while-revalidate=0",
    },
    status: 200,
  });
}
