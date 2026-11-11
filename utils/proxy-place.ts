import type { NextRequest } from "next/server";
import { getCategoriesForProxy } from "@lib/api/categories-proxy";
import { resolvePlaceForProxy } from "@lib/api/places-proxy";
import { isValidDateSlug } from "@lib/dates";
import { FESTIVITY_SLUGS } from "@config/festivities";
import { FESTA_MAJOR_SEGMENT, FESTES_MAJORS_SEGMENT } from "@utils/constants";
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
 * One-page hubs. Anything under them (/festes-majors/x) would match
 * /[place]/[date] and render a 200 soft 404, so it gets a real 404.
 */
const ONE_PAGE_HUBS: ReadonlySet<string> = new Set([
  FESTES_MAJORS_SEGMENT,
  ...FESTIVITY_SLUGS,
]);

const FESTA_MAJOR_SEGMENTS: ReadonlySet<string> = new Set([
  FESTA_MAJOR_SEGMENT,
  FESTES_MAJORS_SEGMENT,
]);

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
  const localePrefix = localeFromPath ? `/${localeFromPath}` : "";
  const redirectTo = (path: string[]): ProxyPlaceCheck => {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/${path.join("/")}`;
    return { kind: "alias", url };
  };

  if (segments.length > 1 && ONE_PAGE_HUBS.has(segments[0]))
    return { kind: "missing" };

  // Festa major hubs: /festa-major/<place>. Deeper paths would fall through
  // to the listing route and render its 404 with a 200.
  if (segments[0] === FESTA_MAJOR_SEGMENT) {
    const slug = segments[1];
    if (!slug || slug === "catalunya")
      return redirectTo([FESTES_MAJORS_SEGMENT]);
    if (segments.length > 2 || !isValidPlace(slug)) return { kind: "missing" };
    const resolution = await resolvePlaceForProxy(slug);
    if (resolution.kind === "missing") return { kind: "missing" };
    if (resolution.kind !== "alias") return null;
    return redirectTo([FESTA_MAJOR_SEGMENT, resolution.slug]);
  }

  // News routes: /noticies/<place>, /noticies/<place>/rss.xml, /noticies/<place>/<article>.
  // Redirect migrated place aliases (301) and 404 missing places on list/RSS paths;
  // 3-segment article paths keep missing-place pass-through so the article page can
  // permanent-redirect a wrong-place URL to the article's canonical place.
  if (segments[0] === "noticies") {
    if (segments.length === 1) return null;
    if (segments.length > 3) return { kind: "missing" };
    const placeSlug = segments[1];
    if (segments.length === 2 && placeSlug === "rss.xml") return null;
    if (placeSlug === "catalunya") return null;
    const isArticlePath = segments.length === 3 && segments[2] !== "rss.xml";
    if (!isValidPlace(placeSlug)) {
      return isArticlePath ? null : { kind: "missing" };
    }
    const resolution = await resolvePlaceForProxy(placeSlug);
    if (resolution.kind === "alias") {
      return redirectTo(["noticies", resolution.slug, ...segments.slice(2)]);
    }
    if (!isArticlePath && resolution.kind === "missing") {
      return { kind: "missing" };
    }
    return null;
  }

  // Archive routes: /sitemap/<town>(/<year>(/<month>)?)
  // 3-segment /sitemap/<town>/<year> has no page of its own, so 301 verified/alias
  // towns in one hop (/sitemap for catalunya, /sitemap/<canonical> otherwise).
  if (segments[0] === "sitemap") {
    if (segments.length === 1) return null;
    if (segments.length > 4) return { kind: "missing" };
    const townSlug = segments[1];
    if (townSlug === "catalunya") {
      return segments.length === 3 ? redirectTo(["sitemap"]) : null;
    }
    if (!isValidPlace(townSlug)) return { kind: "missing" };
    const resolution = await resolvePlaceForProxy(townSlug);
    if (resolution.kind === "missing") return { kind: "missing" };
    if (
      segments.length === 3 &&
      (resolution.kind === "exists" || resolution.kind === "alias")
    ) {
      const canonicalSlug =
        resolution.kind === "alias" ? resolution.slug : townSlug;
      return redirectTo(["sitemap", canonicalSlug]);
    }
    if (resolution.kind !== "alias") return null;
    return redirectTo(["sitemap", resolution.slug, ...segments.slice(2)]);
  }

  const slug = segments[0] ?? "";
  // /<place>/festes-majors would 301 to /<place> as an unknown category.
  // Send it to the hub, which then handles aliases and unknown towns.
  if (
    segments.length === 2 &&
    FESTA_MAJOR_SEGMENTS.has(segments[1]) &&
    isPlacePath(segments)
  ) {
    return redirectTo(
      slug === "catalunya"
        ? [FESTES_MAJORS_SEGMENT]
        : [FESTA_MAJOR_SEGMENT, slug],
    );
  }

  if (slug === "catalunya" || !isPlacePath(segments)) return null;

  const resolution = await resolvePlaceForProxy(slug);
  if (resolution.kind === "missing") return { kind: "missing" };
  if (resolution.kind !== "alias") return null;
  return redirectTo([resolution.slug, ...segments.slice(1)]);
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
