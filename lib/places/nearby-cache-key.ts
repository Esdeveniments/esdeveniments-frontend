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

/** 2 decimal places ≈ 1.1 km. */
export const NEARBY_GRID = 100;

/**
 * Below this radius, snapping (which can move the centre up to ~700m) could
 * push the search area off the caller's point and return wrong results, so
 * exact coordinates are used instead. The app always searches at 5km, so it
 * always snaps; only small-radius direct callers fall back to exact.
 */
export const SNAP_MIN_RADIUS_M = 2000;

export function snapCoordinate(value: number): number {
  return Math.round(value * NEARBY_GRID) / NEARBY_GRID;
}

/** The centre to actually search/cache with: snapped for wide radii, exact for narrow ones. */
export function nearbySearchCenter(
  lat: number,
  lng: number,
  radiusMeters: number
): { lat: number; lng: number } {
  if (radiusMeters < SNAP_MIN_RADIUS_M) return { lat, lng };
  return { lat: snapCoordinate(lat), lng: snapCoordinate(lng) };
}

export function buildNearbyCacheKey(
  lat: number,
  lng: number,
  radiusMeters: number
): string {
  const center = nearbySearchCenter(lat, lng, radiusMeters);
  return `places:nearby:v1:${center.lat}:${center.lng}:r${radiusMeters}`;
}
