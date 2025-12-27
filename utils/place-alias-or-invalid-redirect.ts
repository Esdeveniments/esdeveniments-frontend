import type { AppLocale } from "types/i18n";
import { getPlaceAliasRedirectUrl } from "@utils/place-alias-redirect";

/**
 * Consolidates the late place-existence check used by place pages:
 * - if the place is an alias, redirect to the canonical slug (preserving query params)
 * - if the place is invalid, redirect to a Catalunya fallback URL
 *
 * Returns a redirect URL (already locale-aware) or null.
 */
export async function getPlaceAliasOrInvalidPlaceRedirectUrl(params: {
  place: string;
  locale: AppLocale;
  rawSearchParams: Record<string, string | string[] | undefined>;
  buildTargetPath: (alias: string) => string;
  buildFallbackUrlForInvalidPlace: () => string;
  fetchPlaceBySlug: (place: string) => Promise<unknown | null>;
}): Promise<string | null> {
  const {
    place,
    locale,
    rawSearchParams,
    buildTargetPath,
    buildFallbackUrlForInvalidPlace,
    fetchPlaceBySlug,
  } = params;

  // Catalunya is always valid and special-cased across the app.
  if (place === "catalunya") return null;

  // Late existence check to preserve UX without creating an early enumeration oracle.
  let placeExists: boolean | undefined;
  try {
    placeExists = (await fetchPlaceBySlug(place)) !== null;
  } catch {
    // ignore transient errors
  }

  if (placeExists !== true) {
    const aliasRedirectUrl = await getPlaceAliasRedirectUrl({
      place,
      placeExists,
      locale,
      rawSearchParams,
      buildTargetPath,
    });
    if (aliasRedirectUrl) {
      return aliasRedirectUrl;
    }
  }

  if (placeExists === false) {
    return buildFallbackUrlForInvalidPlace();
  }

  return null;
}
