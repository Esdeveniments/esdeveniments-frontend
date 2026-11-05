import type { PlaceResponseDTO, ProxyPlaceResolution } from "types/api/place";
import { createCache, createKeyedCache } from "@lib/api/cache";
import { resolvePlaceSlugAliasFromPlaces } from "@utils/place-alias";
import {
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
  PLACES_LIST_CACHE_KEY,
} from "./places-external";

// Proxy is bundled apart from the app, so /api/revalidate can't clear
// placeExistsCache. The short TTL bounds how long a newly added place can 404.
// The place list shares the app's entry (PLACES_LIST_CACHE_KEY): it's filled
// at server start, and /api/revalidate clears it for both.
const PROXY_PLACE_TTL_MS = 60 * 60 * 1000;
// Proxy runs before every page request; a slow backend must not delay pages.
// On timeout the page is served as before.
const PROXY_PLACE_TIMEOUT_MS = 1500;
const { cache: placeExistsCache } = createKeyedCache<boolean>(
  PROXY_PLACE_TTL_MS,
  { maxEntries: 5000 },
);
const { cache: placesCache } = createCache<PlaceResponseDTO[]>(
  PROXY_PLACE_TTL_MS,
  { storeEmpty: false, globalKey: PLACES_LIST_CACHE_KEY },
);
// After a failure, skip the backend for a while so an outage doesn't add the
// timeout to every request or pile more calls onto a struggling backend.
const PROXY_PLACE_BACKOFF_MS = 30 * 1000;
let backoffUntil = 0;

// The list fetch is shared (one per process, also started by the startup
// warm-up and by fetchPlaces), so it runs without this request's signal: the
// proxy stops waiting at its own deadline while the fetch keeps going and
// fills the cache for everyone. Aborting a shared fetch would hand [] to the
// other callers waiting on it.
function loadPlaces(signal: AbortSignal): Promise<PlaceResponseDTO[]> {
  const deadline = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  // The deadline may fire after the list arrived; nothing awaits it then.
  deadline.catch(() => {});
  return Promise.race([
    placesCache(() => fetchPlacesAggregatedExternal()),
    deadline,
  ]);
}

function failOpen(): ProxyPlaceResolution {
  backoffUntil = Date.now() + PROXY_PLACE_BACKOFF_MS;
  return { kind: "unknown" };
}

/**
 * Decides whether a place slug exists, is an alias of a real place, or is
 * missing. Any backend failure (or an empty place list) returns "unknown" so
 * the request is served as before instead of a false 404.
 */
export async function resolvePlaceForProxy(
  slug: string,
): Promise<ProxyPlaceResolution> {
  if (Date.now() < backoffUntil) return { kind: "unknown" };
  // One deadline for the whole check. It aborts the per-slug lookup (which
  // only the proxy uses) and stops the wait for the shared place list.
  const signal = AbortSignal.timeout(PROXY_PLACE_TIMEOUT_MS);

  try {
    // The list of all regions/cities answers most lookups from memory, so a
    // cold process makes one list call instead of one call per place.
    const places = await loadPlaces(signal);
    if (places.length === 0) return failOpen();
    if (places.some((place) => place.slug === slug)) return { kind: "exists" };

    // Places missing from the list (e.g. provinces) need a direct lookup.
    const exists = await placeExistsCache(
      slug,
      async (key) =>
        (await fetchPlaceBySlugExternal(String(key), { signal })) !== null,
    );
    if (exists) return { kind: "exists" };

    const alias = resolvePlaceSlugAliasFromPlaces(slug, places);
    return alias ? { kind: "alias", slug: alias } : { kind: "missing" };
  } catch {
    return failOpen();
  }
}
