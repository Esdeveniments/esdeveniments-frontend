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

/** Raw date and time fields of an event, as the backend sends them. */
export interface EventWindowInput {
  startDate: string;
  endDate?: string | null;
  /** `undefined` means the caller has no separate time field. */
  startTime?: string | null;
  endTime?: string | null;
}

/**
 * When an event happens, in Madrid wall-clock time: days are "YYYY-MM-DD",
 * times "HH:mm". All-day events have no times.
 */
export interface EventWindow {
  startDay: string;
  startTime: string | null;
  endDay: string | null;
  endTime: string | null;
  isAllDay: boolean;
}

export type EventStatusLabels = {
  past: string;
  live: string;
  upcoming: string;
  endsInDays: string;
  endsInHours: string;
  endsSoon: string;
  startsInDays: string;
  startsInHours: string;
  startsToday: string;
  today: string;
};
