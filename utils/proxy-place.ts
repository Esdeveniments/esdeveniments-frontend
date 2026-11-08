import type { NextRequest } from "next/server";
import { getCategoriesForProxy } from "@lib/api/categories-proxy";
import { resolvePlaceForProxy } from "@lib/api/places-proxy";
import { isValidDateSlug } from "@lib/dates";
import { NON_PLACE_FIRST_SEGMENTS } from "@utils/middleware-redirects";
import { isValidPlace } from "@utils/route-validation";
import { getRedirectUrl, parseFiltersFromUrl } from "@utils/url-filters";
import type { ProxyPlaceCheck } from "types/api/place";

/**
 * Whether a locale-less path (split into segments) is a place listing:
 * /[place], /[place]/[date|category] or /[place]/[date]/[category].
 */
export function isPlacePath(segments: readonly string[]): boolean {
  const slug = segments[0] ?? "";
  return (
    segments.length >= 1 &&
    segments.length <= 3 &&
    !NON_PLACE_FIRST_SEGMENTS.has(slug) &&
    isValidPlace(slug)
  );
}

/**
 * No page route can match: not a top-level route folder and not a place
 * listing (e.g. /a/b/c/d). Dotted first segments (icons, files) are left alone.
 */
export function isUnroutablePath(pathnameWithoutLocale: string): boolean {
  const segments = pathnameWithoutLocale.split("/").filter(Boolean);
  const slug = segments[0];
  return (
    !!slug &&
    !slug.includes(".") &&
    !NON_PLACE_FIRST_SEGMENTS.has(slug) &&
    !isPlacePath(segments)
  );
}

/**
 * Unknown places get a real 404 and aliases a 301. Pages stream inside the
 * root layout's Suspense, so notFound()/redirect() there can't set a status
 * (they become 200 + noindex / a client redirect). Next's docs recommend
 * checking the slug in Proxy instead. Backend errors fail open (null).
 */
export async function checkPlace(
  request: NextRequest,
  pathnameWithoutLocale: string,
  localeFromPath: string | null,
): Promise<ProxyPlaceCheck | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const segments = pathnameWithoutLocale.split("/").filter(Boolean);
  const slug = segments[0] ?? "";
  if (slug === "catalunya" || !isPlacePath(segments)) return null;

  const resolution = await resolvePlaceForProxy(slug);
  if (resolution.kind === "missing") return { kind: "missing" };
  if (resolution.kind !== "alias") return null;

  const url = request.nextUrl.clone();
  url.pathname = [
    localeFromPath ? `/${localeFromPath}` : "",
    `/${resolution.slug}`,
    ...segments.slice(1).map((segment) => `/${segment}`),
  ].join("");
  return { kind: "alias", url };
}

/**
 * Unknown category slugs (/barcelona/concerts) get a 301 to the canonical
 * listing, using the same parseFiltersFromUrl/getRedirectUrl as the page. In
 * the page that redirect streams as 200 + meta refresh, which Google can
 * index as a soft 404. The query is kept, as in checkPlace. Returns null when
 * the URL is canonical or the backend can't answer (the page then redirects).
 */
export async function checkCategory(
  request: NextRequest,
  pathnameWithoutLocale: string,
  localeFromPath: string | null,
): Promise<URL | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const segments = pathnameWithoutLocale.split("/").filter(Boolean);
  if (segments.length < 2 || !isPlacePath(segments)) return null;
  // /place/date has no category to check: skip the backend.
  if (segments.length === 2 && isValidDateSlug(segments[1])) return null;

  const categories = await getCategoriesForProxy();
  if (!categories) return null;

  const [place, date, category] = segments;
  const canonicalPath = getRedirectUrl(
    parseFiltersFromUrl(
      { place, date, category },
      new URLSearchParams(),
      categories,
    ),
  );
  if (!canonicalPath || canonicalPath === pathnameWithoutLocale) return null;

  const url = request.nextUrl.clone();
  url.pathname = `${localeFromPath ? `/${localeFromPath}` : ""}${canonicalPath}`;
  return url;
}
