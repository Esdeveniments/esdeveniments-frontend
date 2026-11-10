import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import type { EventMapPoint } from "types/event-map";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

// A venue further than this from its town is a geocoding error (e.g. ICGC
// matched "Teatre Mundial" to la Bisbal instead of Barcelona).
const MAX_VENUE_DISTANCE_KM = 25;
const KM_PER_DEGREE = 111.32;

const isCoord = (lat: unknown, lon: unknown): boolean =>
  typeof lat === "number" &&
  typeof lon === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lon) <= 180 &&
  !(lat === 0 && lon === 0);

// Equirectangular approximation: accurate enough at town scale.
const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const x = (bLon - aLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.hypot(x, bLat - aLat) * KM_PER_DEGREE;
};

// The event's own venue coordinates, only when the backend says they are the
// real venue and they sit near the event's town. Otherwise null.
export function getEventVenueCoords(
  event: EventSummaryResponseDTO,
): { lat: number; lon: number } | null {
  const { latitude: lat, longitude: lon, locationPrecision, city } = event;
  if (locationPrecision !== "VENUE" || !isCoord(lat, lon)) return null;
  const venue = { lat: lat as number, lon: lon as number };
  if (
    city &&
    isCoord(city.latitude, city.longitude) &&
    distanceKm(venue.lat, venue.lon, city.latitude, city.longitude) >
      MAX_VENUE_DISTANCE_KM
  ) {
    return null;
  }
  return venue;
}

// Groups the listed events into map markers: one per known venue, and one
// town bubble per town for events without a known venue. Ads and events with
// neither venue nor town coordinates are skipped.
export function buildEventMapPoints(events: ListEvent[]): EventMapPoint[] {
  const points = new Map<string, EventMapPoint>();
  for (const event of events) {
    if (!isEventSummaryResponseDTO(event)) continue;
    const venue = getEventVenueCoords(event);
    const city = event.city;
    let key: string;
    let base: Omit<EventMapPoint, "events">;
    if (venue) {
      key = `venue:${venue.lat.toFixed(5)},${venue.lon.toFixed(5)}`;
      base = { id: key, kind: "venue", ...venue, label: event.location || city?.name || "" };
    } else if (city && isCoord(city.latitude, city.longitude)) {
      key = `town:${city.id}`;
      base = { id: key, kind: "town", lat: city.latitude, lon: city.longitude, label: city.name };
    } else {
      continue;
    }
    const point = points.get(key);
    if (point) point.events.push(event);
    else points.set(key, { ...base, events: [event] });
  }
  return [...points.values()];
}
