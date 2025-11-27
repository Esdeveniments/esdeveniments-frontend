// Canonical type for temporal status of an event detail page
// Added to support clearer UX messaging on past/live/upcoming events.
export type EventTemporalStatus =
  | { state: "past"; label: string; endedOn: string }
  | { state: "live"; label: string; endsIn?: string }
  | { state: "upcoming"; label: string; startsIn?: string };

// Simplified meta used by header pill (separate from full discriminated union)
export interface EventStatusMeta {
  state: "past" | "live" | "upcoming";
  label: string;
}
