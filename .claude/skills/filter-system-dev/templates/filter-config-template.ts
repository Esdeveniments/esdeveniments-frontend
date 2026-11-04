/**
 * Filter configuration template.
 *
 * Copy the object into FILTER_CONFIGURATIONS in config/filters.ts and replace
 * the three placeholders below (FILTER_KEY, DEFAULT_VALUE, FILTER_TYPE) with
 * literal values. The key must exist in URLFilterState (types/url-filters.ts).
 * See the filter-system-dev skill for the other files a new filter touches
 * (URL parse/build, modal, useEvents).
 *
 * This file is documentation: it is not imported.
 */
import type { FilterConfig, FilterDisplayState } from "types/filters";
import type { RouteSegments, URLFilterState } from "types/url-filters";

// Placeholders: replace all three.
const FILTER_KEY = "price" satisfies keyof URLFilterState;
// Value when the filter is not set. URL builders must omit it.
const DEFAULT_VALUE = "tots";
// One of: place, category, date, distance, search, coordinates, price.
// createFilterSchema (utils/filter-validation.ts) validates only place,
// category, date, search, distance and coordinates; add a case for a new type.
const FILTER_TYPE: FilterConfig["type"] = "price";

export const exampleFilterConfig: FilterConfig = {
  key: FILTER_KEY,

  // Short internal name (used by validateConfiguration and logs).
  displayName: FILTER_KEY,

  defaultValue: DEFAULT_VALUE,

  type: FILTER_TYPE,

  // true = the filter is active and FiltersClient shows a removable chip.
  // Usually "value differs from the default".
  isEnabled: (state: FilterDisplayState) =>
    state.filters[FILTER_KEY] !== DEFAULT_VALUE,

  // Chip text, or undefined for no chip. Return a raw value or label key when
  // FiltersClient translates it (see how byDate and price do it).
  getDisplayText: (state: FilterDisplayState) => {
    const value = state.filters[FILTER_KEY];
    if (value === DEFAULT_VALUE) return undefined;
    return String(value);
  },

  // Flat object of URL state changes applied when the chip is removed
  // (FilterOperations.getRemovalUrl → buildFilterUrl). `undefined` clears only
  // query filters (distance, price, from, to, lat, lon). For place, byDate,
  // category and searchTerm, buildFilterUrl treats `undefined` as "keep the
  // current value", so set the default instead: { place: "catalunya" },
  // { byDate: DEFAULT_FILTER_VALUE }, { category: DEFAULT_FILTER_VALUE },
  // { searchTerm: "" }. Clear dependent values too, e.g.
  // distance: () => ({ distance: undefined, lat: undefined, lon: undefined }).
  getRemovalChanges: () => ({ [FILTER_KEY]: undefined }),

  // Optional: keys that only make sense with this filter (cleared above too).
  // dependencies: ["lat", "lon"],

  // Optional: value check.
  // validation: (value) => value === "gratis" || value === "pagament",

  // Optional: removing this filter goes to "/" instead of a listing URL.
  specialCases: {
    homeRedirect: (segments: RouteSegments) =>
      segments.place === "catalunya" &&
      segments.date === "avui" &&
      segments.category === "tots",
  },
};
