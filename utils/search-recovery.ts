import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import { buildFilterUrl } from "@utils/url-filters";
import type { SearchRecoveryLink } from "types/filters";
import type { RouteSegments, URLQueryParams } from "types/url-filters";

/**
 * Links for a search with no results: each keeps the search and widens one
 * filter, and only filters that are active get a link. Widening the place also
 * drops the radius, or `useEvents` would still send it.
 */
export function getSearchRecoveryLinks(
  segments: RouteSegments,
  queryParams: URLQueryParams,
): SearchRecoveryLink[] {
  const place = segments.place || "catalunya";
  const date = segments.date || DEFAULT_FILTER_VALUE;
  const category = segments.category || DEFAULT_FILTER_VALUE;
  const current = { place, date, category };
  // Same condition as useEvents: the radius is sent only with lat, lon and distance.
  const hasRadius = Boolean(
    queryParams.lat && queryParams.lon && queryParams.distance,
  );
  const noRadius = { distance: undefined, lat: undefined, lon: undefined };

  const links: SearchRecoveryLink[] = [];
  if (place !== "catalunya") {
    links.push({
      action: "place",
      href: buildFilterUrl(current, queryParams, {
        place: "catalunya",
        ...noRadius,
      }),
    });
  }
  if (hasRadius) {
    links.push({
      action: "distance",
      href: buildFilterUrl(current, queryParams, noRadius),
    });
  }
  if (date !== DEFAULT_FILTER_VALUE || queryParams.from) {
    links.push({
      action: "date",
      href: buildFilterUrl(current, queryParams, {
        byDate: DEFAULT_FILTER_VALUE,
        from: undefined,
        to: undefined,
      }),
    });
  }
  if (category !== DEFAULT_FILTER_VALUE) {
    links.push({
      action: "category",
      href: buildFilterUrl(current, queryParams, {
        category: DEFAULT_FILTER_VALUE,
      }),
    });
  }
  return links;
}
