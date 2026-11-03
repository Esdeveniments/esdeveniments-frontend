import type { NextRequest } from "next/server";
import { resolvePlaceForProxy } from "@lib/api/places-proxy";
import { NON_PLACE_FIRST_SEGMENTS } from "@utils/middleware-redirects";
import { isValidPlace } from "@utils/route-validation";
import type { ProxyPlaceCheck } from "types/api/place";

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
  if (
    segments.length < 1 ||
    segments.length > 3 ||
    slug === "catalunya" ||
    NON_PLACE_FIRST_SEGMENTS.has(slug) ||
    !isValidPlace(slug)
  ) {
    return null;
  }

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
