/**
 * Cache-key helpers for Places "search nearby" results.
 *
 * Snapping coordinates to a coarse grid collapses many distinct event
 * locations within the same area onto one key, so a single Google call serves
 * the whole neighbourhood. The key intentionally excludes the event date: the
 * upstream request doesn't depend on it (date handling happens after the
 * fetch), so one cached result also serves every date in that cell.
 *
 * searchNearby is billed per request, so this is what keeps the Places bill a
 * function of distinct locations, not of traffic.
 */

/** 2 decimal places ≈ 1.1 km — far inside the 5 km search radius, so snapping the centre this much doesn't change which restaurants come back. */
export const NEARBY_GRID = 100;

export function snapCoordinate(value: number): number {
  return Math.round(value * NEARBY_GRID) / NEARBY_GRID;
}

export function buildNearbyCacheKey(
  lat: number,
  lng: number,
  radiusMeters: number
): string {
  return `places:nearby:v1:${snapCoordinate(lat)}:${snapCoordinate(
    lng
  )}:r${radiusMeters}`;
}
