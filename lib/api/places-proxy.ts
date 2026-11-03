import type { PlaceResponseDTO, ProxyPlaceResolution } from "types/api/place";
import { createCache, createKeyedCache } from "@lib/api/cache";
import { resolvePlaceSlugAliasFromPlaces } from "@utils/place-alias";
import {
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
} from "./places-external";

// Proxy is bundled apart from the app, so /api/revalidate can't clear these
// caches. The short TTL bounds how long a newly added place can 404.
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
  { storeEmpty: false },
);

/**
 * Decides whether a place slug exists, is an alias of a real place, or is
 * missing. Any backend failure (or an empty place list) returns "unknown" so
 * the request is served as before instead of a false 404.
 */
export async function resolvePlaceForProxy(
  slug: string,
): Promise<ProxyPlaceResolution> {
  // One deadline for the whole check; fetchWithHmac aborts the fetch on it.
  const signal = AbortSignal.timeout(PROXY_PLACE_TIMEOUT_MS);

  // The list of all regions/cities answers most lookups from memory, so a
  // cold process makes one list call instead of one call per place.
  const places = await placesCache(() =>
    fetchPlacesAggregatedExternal({ signal }),
  ).catch(() => [] as PlaceResponseDTO[]);
  if (places.some((place) => place.slug === slug)) return { kind: "exists" };

  try {
    // Places missing from the list (e.g. provinces) need a direct lookup.
    const exists = await placeExistsCache(
      slug,
      async (key) =>
        (await fetchPlaceBySlugExternal(String(key), { signal })) !== null,
    );
    if (exists) return { kind: "exists" };
    if (places.length === 0) return { kind: "unknown" };

    const alias = resolvePlaceSlugAliasFromPlaces(slug, places);
    return alias ? { kind: "alias", slug: alias } : { kind: "missing" };
  } catch {
    return { kind: "unknown" };
  }
}
