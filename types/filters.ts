/**
 * Unified type system for configuration-driven filter architecture
 */

import type { ErrorInfo, ReactNode } from "react";
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
    // eslint-disable-next-line no-unused-vars
    key:
      | "place"
      | "byDate"
      | "category"
      | "searchTerm"
      | "distance"
      | "openModal",
    // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line no-unused-vars
  isEnabled: (_state: FilterDisplayState) => boolean;
  // eslint-disable-next-line no-unused-vars
  getDisplayText: (_state: FilterDisplayState) => string | undefined;
  getRemovalChanges: () => Partial<URLFilterState>;

  // Optional configurations
  dependencies?: Array<keyof URLFilterState>;
  // eslint-disable-next-line no-unused-vars
  validation?: (_value: T) => boolean;
  specialCases?: {
    // eslint-disable-next-line no-unused-vars
    homeRedirect?: (_segments: RouteSegments) => boolean;
  };
}

// FilterErrorBoundary types
export type FilterErrorBoundaryProps = {
  children: ReactNode;
  fallbackMessage?: string;
  // eslint-disable-next-line no-unused-vars
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void;
};

export type FilterErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};
