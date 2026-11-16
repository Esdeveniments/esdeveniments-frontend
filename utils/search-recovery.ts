import { CATEGORY_CONFIG } from "@config/categories";
import { PLACE_TYPO_MIN_LENGTH } from "@config/search";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import {
  buildPlaceSearchIndex,
  isWithinOneEdit,
  suggestPlaces,
} from "@utils/search-query";
import { foldForSearch } from "@utils/string-helpers";
import { buildFilterUrl } from "@utils/url-filters";
import type { Option } from "types/common";
import type { SearchRecoveryLink, SuggestedPlaceLink } from "types/filters";
import type { RouteSegments, URLQueryParams } from "types/url-filters";

const NO_RADIUS = {
  distance: undefined,
  lat: undefined,
  lon: undefined,
} as const;

const CATEGORY_WORDS = new Set(
  Object.keys(CATEGORY_CONFIG)
    .flatMap((slug) => {
      const folded = foldForSearch(slug);
      return [folded, ...folded.split(" ")];
    })
    .filter((word) => word.length >= 2),
);

/**
 * Places that match a zero-results `?search=` query (exact name/slug, 5+ char
 * prefix/word-start, or 1-edit typo of a full place name), keeping active
 * date/category/price filters while clearing `search` and any radius.
 */
export function getSuggestedPlaceLinks(
  segments: RouteSegments,
  queryParams: URLQueryParams,
  places: readonly Option[],
): SuggestedPlaceLink[] {
  const search = queryParams.search?.trim();
  if (!search || places.length === 0) return [];

  const q = foldForSearch(search);
  if (!q || CATEGORY_WORDS.has(q)) return [];

  const current = {
    place: segments.place || "catalunya",
    date: segments.date || DEFAULT_FILTER_VALUE,
    category: segments.category || DEFAULT_FILTER_VALUE,
  };
  const index = buildPlaceSearchIndex(places);
  const bySlug = new Map(index.map((entry) => [entry.place.value, entry]));

  return suggestPlaces(search, index)
    .filter((place) => {
      const entry = bySlug.get(place.value);
      if (!entry) return false;
      const { label: fl, value: fv } = entry;
      if (fl === q || fv === q) return true;
      if (q.length < PLACE_TYPO_MIN_LENGTH) return false;
      const isPrefix =
        fl.startsWith(q) ||
        fv.startsWith(q) ||
        ` ${fl}`.includes(` ${q}`) ||
        ` ${fv}`.includes(` ${q}`);
      return isPrefix || isWithinOneEdit(q, fl) || isWithinOneEdit(q, fv);
    })
    .map((place) => ({
      label: place.label,
      slug: place.value,
      href: buildFilterUrl(current, queryParams, {
        place: place.value,
        searchTerm: "",
        ...NO_RADIUS,
      }),
    }));
}

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

  const links: SearchRecoveryLink[] = [];
  if (place !== "catalunya") {
    links.push({
      action: "place",
      href: buildFilterUrl(current, queryParams, {
        place: "catalunya",
        ...NO_RADIUS,
      }),
    });
  }
  if (hasRadius) {
    links.push({
      action: "distance",
      href: buildFilterUrl(current, queryParams, NO_RADIUS),
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
