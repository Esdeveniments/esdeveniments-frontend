import type { AppLocale } from "types/i18n";
import { resolvePlaceSlugAlias } from "@utils/place-alias";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { toUrlSearchParams } from "@utils/url-filters";

function ensureLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Builds a locale-aware redirect URL when a place slug is an alias.
 *
 * IMPORTANT: This function is intentionally side-effect free (it does not call next/navigation.redirect)
 * so it can be unit-tested without relying on Next.js runtime behavior.
 */
export async function getPlaceAliasRedirectUrl(params: {
  place: string;
  placeExists: boolean | undefined;
  locale: AppLocale;
  rawSearchParams?: Record<string, string | string[] | undefined>;
  buildTargetPath: (alias: string) => string;
}): Promise<string | null> {
  const {
    place,
    placeExists,
    locale,
    rawSearchParams = {},
    buildTargetPath,
  } = params;

  if (placeExists === true) return null;

  const alias = await resolvePlaceSlugAlias(place);
  if (!alias) return null;

  const queryString = toUrlSearchParams(rawSearchParams).toString();
  const targetPath = ensureLeadingSlash(buildTargetPath(alias));
  const targetWithQuery = queryString
    ? `${targetPath}?${queryString}`
    : targetPath;

  return toLocalizedUrl(targetWithQuery, locale);
}
