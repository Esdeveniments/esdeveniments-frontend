export type BuildDisplayLocationOptions = {
  location: string;
  cityName: string;
  regionName: string;
  hidePlaceSegments?: boolean;
};

export type EventLocationLabelOptions = {
  cityName?: string | null;
  regionName?: string | null;
  location?: string | null;
  /**
   * Determines which value should be attempted first for the secondary label.
   * - "venue": prefer the specific venue/location as the secondary line.
   * - "region": prefer the region name as the secondary line.
   * Defaults to "venue" to match card layouts.
   */
  secondaryPreference?: "venue" | "region";
};

export type EventPlaceLabelOptions = {
  cityName?: string | null;
  regionName?: string | null;
  location?: string | null;
};

/** Base set of location labels shared by all label helpers. */
export type EventPlaceLabels = {
  cityLabel: string;
  regionLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
};

/** Full location labels including venue (for event detail page). */
export type EventLocationLabels = EventPlaceLabels & { venueLabel: string };

/**
 * List location labels including the raw location string.
 * `EventListLocationLabelOptions` is structurally identical to `EventPlaceLabelOptions`;
 * use `EventPlaceLabelOptions` as the input type for `buildEventListLocationLabels`.
 */
export type EventListLocationLabels = EventPlaceLabels & { locationLabel: string };
