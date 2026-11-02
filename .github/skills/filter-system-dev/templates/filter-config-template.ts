/**
 * Filter configuration template.
 *
 * Copy the object into FILTER_CONFIGURATIONS in config/filters.ts and replace
 * the FILTER_KEY / DEFAULT_VALUE placeholders. The key must exist in
 * URLFilterState (types/url-filters.ts). See the filter-system-dev skill for
 * the other files a new filter touches (URL parse/build, modal, useEvents).
 *
 * This file is documentation: it is not type-checked or imported.
 */
import type { FilterConfig, FilterDisplayState } from "types/filters";
import type { RouteSegments } from "types/url-filters";

export const exampleFilterConfig: FilterConfig = {
  // Key in URLFilterState, e.g. "price".
  key: "FILTER_KEY",

  // Short internal name (used by validateConfiguration and logs).
  displayName: "FILTER_KEY",

  // Value when the filter is not set. URL builders must omit it.
  defaultValue: "DEFAULT_VALUE",

  // One of: place, category, date, distance, search, coordinates, price.
  type: "price",

  // true = the filter is active and FiltersClient shows a removable chip.
  // Usually "value differs from the default".
  isEnabled: (state: FilterDisplayState) =>
    state.filters.FILTER_KEY !== "DEFAULT_VALUE",

  // Chip text, or undefined for no chip. Return a raw value or label key when
  // FiltersClient translates it (see how byDate and price do it).
  getDisplayText: (state: FilterDisplayState) => {
    if (state.filters.FILTER_KEY === "DEFAULT_VALUE") return undefined;
    return String(state.filters.FILTER_KEY);
  },

  // Flat object of URL state changes applied when the chip is removed
  // (FilterOperations.getRemovalUrl → buildFilterUrl). Clear dependent values
  // too, e.g. distance: () => ({ distance: undefined, lat: undefined, lon: undefined }).
  getRemovalChanges: () => ({ FILTER_KEY: undefined }),

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
