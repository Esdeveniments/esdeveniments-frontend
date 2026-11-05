import type { ProxyPlaceResolution } from "types/api/place";
import { createKeyedCache } from "@lib/api/cache";
import {
  createProxyListLoader,
  PROXY_LIST_TTL_MS,
  PROXY_TIMEOUT_MS,
} from "@lib/api/proxy-list";
import { resolvePlaceSlugAliasFromPlaces } from "@utils/place-alias";
import {
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
  PLACES_LIST_CACHE_KEY,
} from "./places-external";

const { cache: placeExistsCache } = createKeyedCache<boolean>(
  PROXY_LIST_TTL_MS,
  { maxEntries: 5000 },
);
// The place list shares the app's entry (PLACES_LIST_CACHE_KEY): it's filled
// at server start, and /api/revalidate clears it for both. placeExistsCache is
// Proxy's own: its TTL bounds how long a slug cached as missing keeps 404ing
// after that place is added.
const placesLoader = createProxyListLoader(
  () => fetchPlacesAggregatedExternal(),
  { globalKey: PLACES_LIST_CACHE_KEY },
);

function failOpen(): ProxyPlaceResolution {
  placesLoader.backOff();
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
  if (placesLoader.isBackingOff()) return { kind: "unknown" };
  // One deadline for the whole check. It aborts the per-slug lookup (which
  // only Proxy uses) and stops the wait for the shared place list.
  const signal = AbortSignal.timeout(PROXY_TIMEOUT_MS);

  try {
    // The list of all regions/cities answers most lookups from memory, so a
    // cold process makes one list call instead of one call per place.
    const places = await placesLoader.load(signal);
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
