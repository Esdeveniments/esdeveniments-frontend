/**
 * Central filter configuration - Single source of truth for all filter behavior
 * Adding new filters only requires changes here
 */

import type { FilterConfig, FilterDisplayState } from "types/filters";
import { BYDATES, DEFAULT_FILTER_VALUE } from "utils/constants";

export const FILTER_CONFIGURATIONS: FilterConfig[] = [
  {
    key: "place",
    displayName: "Població",
    defaultValue: "catalunya",
    type: "place",
    isEnabled: (state: FilterDisplayState) =>
      state.filters.place !== "catalunya",
    getDisplayText: (state: FilterDisplayState) => {
      if (state.filters.place === "catalunya") return undefined;
      return state.extraData?.placeTypeLabel?.label || state.filters.place;
    },
    getRemovalChanges: () => ({ place: "catalunya" }),
  },

  {
    key: "category",
    displayName: "Categoria",
    defaultValue: DEFAULT_FILTER_VALUE,
    type: "category",
    isEnabled: (state: FilterDisplayState) => state.filters.category !== DEFAULT_FILTER_VALUE,
    getDisplayText: (state: FilterDisplayState) => {
      if (state.filters.category === DEFAULT_FILTER_VALUE) return undefined;
      const category = state.extraData?.categories?.find(
        (cat) => cat.slug === state.filters.category
      );
      return category?.name;
    },
    getRemovalChanges: () => ({ category: DEFAULT_FILTER_VALUE }),
  },

  {
    key: "byDate",
    displayName: "Data",
    defaultValue: DEFAULT_FILTER_VALUE,
    type: "date",
    isEnabled: (state: FilterDisplayState) => state.filters.byDate !== DEFAULT_FILTER_VALUE,
    getDisplayText: (state: FilterDisplayState) => {
      const byDate = BYDATES.find(
        (item) => item.value === state.filters.byDate
      );
      return byDate?.label;
    },
    getRemovalChanges: () => ({ byDate: DEFAULT_FILTER_VALUE }),
  },

  {
    key: "distance",
    displayName: "Distància",
    defaultValue: 50,
    type: "distance",
    dependencies: ["lat", "lon"],
    isEnabled: (state: FilterDisplayState) =>
      state.filters.distance !== 50 ||
      Boolean(state.queryParams.lat && state.queryParams.lon),
    getDisplayText: (state: FilterDisplayState) => {
      const hasLocation = Boolean(
        state.queryParams.lat && state.queryParams.lon
      );
      if (state.filters.distance !== 50 || hasLocation) {
        return `${state.filters.distance} km`;
      }
      return undefined;
    },
    getRemovalChanges: () => ({
      distance: undefined,
      lat: undefined,
      lon: undefined,
    }),
  },

  {
    key: "searchTerm",
    displayName: "Cerca",
    defaultValue: "",
    type: "search",
    // Don't show search term as a chip - it's always visible in the search input field
    // Users can see and edit it directly there, no need for redundant chip display
    isEnabled: () => false,
    getDisplayText: () => undefined,
    getRemovalChanges: () => ({ searchTerm: "" }),
  },
];
