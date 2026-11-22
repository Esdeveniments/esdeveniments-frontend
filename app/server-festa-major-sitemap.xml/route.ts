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
 * The festa major calendar, every hub and every festivity collection
 * (/fires-de-nadal, …) that passes its indexing gate, so the sitemap never
 * lists a noindex page. No lastmod: the hubs have no real edit date.
 * Each read races independently against one shared FESTA_SITEMAP_READ_BUDGET_MS
 * deadline (without aborting late reads, so they finish filling "use cache").
 * Partial responses are never CDN-cached; if the calendar fails/times out or no
 * hub or festivity resolves before the deadline, return 503 so crawlers keep
 * their last complete copy.
 */
const NO_STORE_CACHE_CONTROL = "private, no-store";
const TIMEOUT = Symbol("festa-sitemap-timeout");

function settleWithinBudget<T>(
  promise: Promise<T>,
  budget: Promise<typeof TIMEOUT>,
): Promise<{ timedOut: boolean; failed: boolean; value: T | null }> {
  return Promise.race([
    promise.then(
      (value) => ({ timedOut: false, failed: false, value }),
      () => ({ timedOut: false, failed: true, value: null }),
    ),
    budget.then(() => ({ timedOut: true, failed: false, value: null })),
  ]);
}

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrlFromRequest(request);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), FESTA_SITEMAP_READ_BUDGET_MS);
  });

  const [calendarResult, ...festivityResults] = await Promise.all([
    settleWithinBudget(fetchFestaMajorCalendar(), budget),
    ...FESTIVITY_SLUGS.map((slug) =>
      settleWithinBudget(fetchFestivityPage(slug), budget),
    ),
  ]).finally(() => clearTimeout(timer));

  const calendar = calendarResult.value;
  const festivities = festivityResults.flatMap((res) =>
    res.value ? [res.value] : [],
  );
  const complete =
    !calendarResult.timedOut &&
    !calendarResult.failed &&
    calendar?.complete === true &&
    festivityResults.every(
      (res) => !res.timedOut && !res.failed && res.value?.available === true,
    );

  const resolvedHubPaths = [
    ...(calendar ? indexableHubPaths(calendar) : []),
    ...indexableFestivityPaths(festivities),
  ];

  // When the calendar itself failed or timed out (dropping nearly all hubs), or
  // an incomplete read leaves only the static calendar path, answer 503 so
  // Bing/Google preserve their last complete copy.
  if (!calendar || (!complete && resolvedHubPaths.length === 0)) {
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        "Retry-After": "300",
      },
    });
  }

  const paths = [`/${FESTES_MAJORS_SEGMENT}`, ...resolvedHubPaths];
  const xml = buildSitemap(
    paths.map((path) => ({
      loc: `${siteUrl}${path}`,
      alternates: buildAlternateLinks(`${siteUrl}${path}`),
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Never cache incomplete XML at the edge; complete snapshots cache 6 h.
      "Cache-Control": complete
        ? "public, s-maxage=21600, stale-while-revalidate=86400"
        : NO_STORE_CACHE_CONTROL,
    },
    status: 200,
  });
}
