/**
 * Configuration-driven filter system - LEGACY FILE
 * This file is being replaced by config/filters.ts and utils/filter-operations.ts
 * Keeping for backward compatibility during migration
 */

import type { URLFilterState } from "types/url-filters";
import { FilterOperations } from "./filter-operations";

export const FILTER_DEFAULTS = {
  place: "catalunya",
  byDate: "tots",
  category: "tots",
  searchTerm: "",
  distance: 50,
  lat: undefined,
  lon: undefined,
} as const;

/**
 * @deprecated Use FilterOperations.getConfig(filterKey).getRemovalChanges() instead
 * Generic filter removal function using configuration
 */
export function createFilterRemovalChanges(
  filterType: keyof URLFilterState
): Partial<URLFilterState> {
  // Use new configuration-driven approach
  const config = FilterOperations.getConfig(filterType);
  if (config) {
    return config.getRemovalChanges();
  }

  // Fallback to legacy logic for backward compatibility
  const changes: Partial<URLFilterState> = {};

  // Handle distance filter - remove distance, lat, and lon
  if (filterType === "distance") {
    changes.distance = undefined;
    changes.lat = undefined;
    changes.lon = undefined;
    return changes;
  }

  // Handle other filters by resetting to defaults
  switch (filterType) {
    case "place":
      changes.place = FILTER_DEFAULTS.place;
      break;
    case "byDate":
      changes.byDate = FILTER_DEFAULTS.byDate;
      break;
    case "category":
      changes.category = FILTER_DEFAULTS.category;
      break;
    case "searchTerm":
      changes.searchTerm = FILTER_DEFAULTS.searchTerm;
      break;
    case "lat":
    case "lon":
      changes[filterType] = undefined;
      break;
    default:
      console.warn(`Unknown filter type: ${filterType}`);
  }

  return changes;
}
