import { fetchEventsExternalResult } from "@lib/api/events-external";
import { fetchPlaces } from "@lib/api/places";
import {
  SITEMAP_EVENTS_PER_CHUNK,
  SITEMAP_PLACES_PER_CHUNK,
} from "@utils/constants";

// Used when the backend can't be read, so an index keeps the usual chunks.
const CHUNKS_FALLBACK = 5;
// Caps the backend work one sitemap crawl can trigger (10,000 events).
const EVENT_CHUNKS_MAX = 20;

// Chunk count for /sitemap-events/N.xml, from the same query those chunks
// page through. A fixed count left upcoming events past the 2,500th out.
export async function fetchEventSitemapChunkCount(): Promise<number> {
  const { data } = await fetchEventsExternalResult({ page: 0, size: 1 });
  if (!data) return CHUNKS_FALLBACK;
  return Math.min(
    Math.ceil(data.totalElements / SITEMAP_EVENTS_PER_CHUNK),
    EVENT_CHUNKS_MAX,
  );
}

// Chunk count for /sitemap-places/N.xml. fetchPlaces returns [] on failure,
// and production always has places, so an empty list means the backend
// couldn't be read.
export async function fetchPlaceSitemapChunkCount(): Promise<number> {
  const places = await fetchPlaces();
  if (places.length === 0) return CHUNKS_FALLBACK;
  return Math.ceil(places.length / SITEMAP_PLACES_PER_CHUNK);
}
