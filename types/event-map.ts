import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";

// One marker on the events map. "venue": events whose real venue we know.
// "town": events we only know the town of (drawn as a town bubble, never a
// fake pin at the town centre).
export interface EventMapPoint {
  id: string;
  kind: "venue" | "town";
  lat: number;
  lon: number;
  label: string;
  events: EventSummaryResponseDTO[];
}

// What the listing shows right now, published by HybridEventsListClient for
// the events map (components/context/ListingEventsContext.tsx).
export interface ListingEventsState {
  events: EventSummaryResponseDTO[];
  isLoading: boolean;
}

export interface PublishListingEventsInput {
  realInitialEvents: EventSummaryResponseDTO[];
  displayedEvents: ListEvent[];
  hasClientFilters: boolean;
  showFallbackEvents: boolean;
  isLoading: boolean;
}

export type EventsMapStatus = "loading" | "ready" | "error";

// Why the map failed to load, sent as `map_load_error` in GA: "init" (no
// WebGL), "timeout", or "error" (style, tiles or worker).
export type EventsMapLoadFailure = "init" | "timeout" | "error";

// Read from CSS (text-primary / text-foreground) so the map has no hex copies.
export interface EventsMapColors {
  primary: string;
  ink: string;
}

export interface UseEventsMapLibreInput {
  points: EventMapPoint[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  // Height of the mobile bottom sheet over the map (0 on desktop).
  insetBottom: number;
  // MapLibre's own UI text (zoom buttons, attribution), localised.
  uiStrings: Record<string, string>;
}
