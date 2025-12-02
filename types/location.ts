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

export type EventLocationLabels = {
  cityLabel: string;
  regionLabel: string;
  venueLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
};
