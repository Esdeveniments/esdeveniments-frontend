import type { RouteSegments } from "./url-filters";

/**
 * Raw URL segments returned by the URL parser.
 * All fields are optional because not every URL contains all three segments.
 * Contrast with `RouteSegments` which represents the fully-resolved filter state
 * where defaults have been applied.
 */
export type URLSegments = Partial<RouteSegments>;
