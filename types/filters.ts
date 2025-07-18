/**
 * Unified type system for configuration-driven filter architecture
 */

import type {
  URLFilterState,
  URLQueryParams,
  RouteSegments,
} from "./url-filters";

// Unified filter value types
export type FilterValue = string | number | boolean | undefined;

// Legacy interface for backward compatibility
export interface FilterState {
  place: string;
  byDate: string;
  category: string;
  searchTerm: string;
  distance: string;
  openModal: boolean;
  setState: (
    key:
      | "place"
      | "byDate"
      | "category"
      | "searchTerm"
      | "distance"
      | "openModal",
    value: string | boolean
  ) => void;
}

// Runtime state for filter display
export interface FilterDisplayState {
  filters: URLFilterState;
  queryParams: URLQueryParams;
  segments: RouteSegments;
  extraData?: {
    categories?: Array<{ slug: string; name: string }>;
    placeTypeLabel?: { label: string };
    [key: string]: unknown;
  };
}

// Base filter configuration
export interface FilterConfig<T extends FilterValue = FilterValue> {
  key: keyof URLFilterState;
  displayName: string;
  defaultValue: T;
  type: "place" | "category" | "date" | "distance" | "search" | "coordinates";

  // Behavior functions
  isEnabled: (state: FilterDisplayState) => boolean;
  getDisplayText: (state: FilterDisplayState) => string | undefined;
  getRemovalChanges: () => Partial<URLFilterState>;

  // Optional configurations
  dependencies?: Array<keyof URLFilterState>;
  validation?: (value: T) => boolean;
  specialCases?: {
    homeRedirect?: (segments: RouteSegments) => boolean;
  };
}
