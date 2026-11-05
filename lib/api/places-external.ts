import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import type { PlaceResponseDTO } from "types/api/place";
import { parsePlace, parsePlaces } from "lib/validation/place";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This creates a separate cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

const MAX_PLACE_SLUG_LENGTH = 80;
const MIN_NON_HYPHENATED_SUSPICIOUS_LENGTH = 18;

export function isSuspiciousPlaceSlug(rawSlug: string): boolean {
  const slug = rawSlug.trim().toLowerCase();
  if (slug.length === 0) return true;

  // Hard safety limits (avoid pathological upstream calls)
  if (slug.length > MAX_PLACE_SLUG_LENGTH) return true;

  // Only allow canonical-ish slug characters for backend lookups
  if (!/^[a-z0-9-]+$/.test(slug)) return true;

  // Bots often try very long, hyphen-less concatenations.
  // Canonical multi-word places should be hyphenated.
  if (!slug.includes("-") && slug.length >= MIN_NON_HYPHENATED_SUSPICIOUS_LENGTH)
    return true;

  // Obvious placeholder-ish values
  if (slug.includes("undefined") || slug.includes("null")) return true;

  return false;
}

export async function fetchPlaceBySlugExternal(
  slug: string,
  { signal }: Pick<RequestInit, "signal"> = {}
): Promise<PlaceResponseDTO | null> {
  // "catalunya" is a frontend-only SEO concept, not a real place in the backend
  // Return null early to avoid unnecessary API calls
  // Bot-style slugs never reach the backend.
  if (slug === "catalunya" || isSuspiciousPlaceSlug(slug)) {
    return null;
  }

  const api = getApiUrl();
  try {
    const encodedSlug = encodeURIComponent(slug);
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/${encodedSlug}`, { signal });
    if (res.status === 404) {
      // Place definitively doesn't exist - return null to signal not found
      return null;
    }
    if (!res.ok) {
      // Other HTTP errors (500, etc.) - throw to distinguish from 404
      console.error("fetchPlaceBySlugExternal:", slug, "HTTP", res.status);
      throw new Error(`Failed to fetch place ${slug}: HTTP ${res.status}`);
    }
    const json = await res.json();
    const place = parsePlace(json);
    // An invalid 200 is a failure, not "not found": throw so it is not cached.
    if (!place) throw new Error(`Invalid place payload for ${slug} (HTTP 200)`);
    return place;
  } catch (error) {
    // Network errors or other exceptions - rethrow to distinguish from 404
    // Only log if it's not already an Error with message (to avoid double logging)
    if (error instanceof Error && error.message.includes("HTTP")) {
      throw error; // Re-throw HTTP errors
    }
    console.error("fetchPlaceBySlugExternal:", slug, "failed", error);
    throw new Error(`Network error fetching place ${slug}: ${error}`);
  }
}

// globalKey of the place-list cache that lib/api/places.ts and proxy.ts share.
// Here, not in utils/constants.ts, so the proxy bundle doesn't pull in
// next-intl and the locale labels with it.
export const PLACES_LIST_CACHE_KEY = "places:aggregated";

// skipConnection: for the startup warm-up (instrumentation.ts), which runs
// outside a request, where connection() throws.
export async function fetchPlacesAggregatedExternal({
  signal,
  skipConnection,
}: Pick<RequestInit, "signal"> & { skipConnection?: boolean } = {}): Promise<
  PlaceResponseDTO[]
> {
  const api = getApiUrl();
  const endpoints: Array<{ path: string; type: "REGION" | "CITY" }> = [
    { path: "/places/regions", type: "REGION" },
    { path: "/places/cities", type: "CITY" },
  ];
  // Throws when either endpoint fails, so a partial list is never cached or
  // served as complete.
  const results = await Promise.all(
    endpoints.map(async ({ path, type }) => {
      const endpoint = `${api}${path}`;
      // No `next: { revalidate }` - uses no-store to avoid cache explosion
      const response = await fetchWithHmac(endpoint, { signal, skipConnection });
      if (!response.ok) {
        throw new Error(
          `fetchPlacesAggregatedExternal: ${endpoint} HTTP ${response.status}`
        );
      }
      const json = await response.json();
      if (!Array.isArray(json)) {
        throw new Error(`fetchPlacesAggregatedExternal: ${endpoint} not a list`);
      }
      // Add type field to each place based on the endpoint
      const placesWithType = json.map((place: unknown) => ({
        ...(place as Record<string, unknown>),
        type,
      }));
      const places = parsePlaces(placesWithType);
      // parsePlaces returns [] for an invalid payload; only a real [] is empty.
      if (placesWithType.length > 0 && places.length === 0) {
        throw new Error(`fetchPlacesAggregatedExternal: ${endpoint} invalid payload`);
      }
      return places;
    })
  );
  const all = results.flat();
  const map = new Map<string, PlaceResponseDTO>();
  for (const p of all) {
    if (!map.has(p.slug)) map.set(p.slug, p);
  }
  return Array.from(map.values());
}
