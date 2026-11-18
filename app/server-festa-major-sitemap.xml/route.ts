import { getSiteUrlFromRequest } from "@config/index";
import { FESTIVITY_SLUGS } from "@config/festivities";
import { fetchFestaMajorCalendar } from "@lib/api/festes-majors";
import { fetchFestivityPage } from "@lib/api/festivities";
import {
  FESTA_SITEMAP_READ_BUDGET_MS,
  FESTES_MAJORS_SEGMENT,
} from "@utils/constants";
import { indexableHubPaths } from "@utils/festa-major-calendar";
import { indexableFestivityPaths } from "@utils/festivity";
import { buildAlternateLinks } from "@utils/i18n-seo";
import { buildSitemap } from "@utils/sitemap";
import { NextRequest } from "next/server";

/**
 * The festa major calendar, every hub and every Nadal collection
 * (/fires-de-nadal, …) that passes its indexing gate, so the sitemap never
 * lists a noindex page. No lastmod: the hubs have no real
 * edit date. Reads slower than FESTA_SITEMAP_READ_BUDGET_MS leave only the
 * calendar, cached briefly, while they keep filling the cache.
 */
export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrlFromRequest(request);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), FESTA_SITEMAP_READ_BUDGET_MS);
  });
  const reads = await Promise.race([
    Promise.all([
      fetchFestaMajorCalendar(),
      Promise.all(FESTIVITY_SLUGS.map((slug) => fetchFestivityPage(slug))),
    ]),
    budget,
  ]).finally(() => clearTimeout(timer));
  const [calendar, festivities] = reads ?? [null, []];
  const complete =
    calendar?.complete === true && festivities.every((p) => p.available);
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
