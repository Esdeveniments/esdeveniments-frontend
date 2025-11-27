/**
 * URL filtering and routing types
 * Centralized types for URL-first filter management
 */

// Extended to support both static and dynamic categories
export type URLCategory = string;

// URL-based filter state (different from UI FilterState in filters.ts)
export interface URLFilterState {
  place: string;
  byDate: string;
  category: URLCategory;
  searchTerm: string;
  distance: number;
  lat?: number;
  lon?: number;
}

// Route segments from URL parsing
export interface RouteSegments {
  place: string;
  date: string;
  category: string;
}

// Query parameters for URL filtering (different from event QueryParams)
export interface URLQueryParams {
  search?: string;
  distance?: string;
  lat?: string;
  lon?: string;
}

// Complete parsed filter result
export interface ParsedFilters {
  segments: RouteSegments;
  queryParams: URLQueryParams;
  isCanonical: boolean;
}
