import { NextResponse, type NextRequest } from "next/server";
import { PROXY_LIST_TTL_MS } from "@lib/api/proxy-list";
import { gateApiRequest } from "@utils/api-gate";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { handleCanonicalRedirects } from "@utils/middleware-redirects";
import { getAgentRewrite } from "@utils/proxy-agent";
import { applyCsp } from "@utils/proxy-csp";
import {
  getLocaleFromCookie,
  getLocaleRedirect,
  persistLocaleCookie,
} from "@utils/proxy-locale";
import { getLoginEntryRedirect } from "@utils/proxy-login";
import { applyPageHeaders } from "@utils/proxy-page-headers";
import { checkCategory, checkPlace } from "@utils/proxy-place";
import { DEFAULT_LOCALE } from "types/i18n";

// Static headers, trust-page redirects and the /openapi.json and
// /.well-known/mcp rewrites live in next.config.js. This file only holds
// per-request logic.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const loginRedirect = getLoginEntryRedirect(request);
  if (loginRedirect) return loginRedirect;

  // Multipart allowlist, public-route classification, Origin/CSRF check and
  // backend-key/HMAC verification. See utils/api-gate.ts.
  if (pathname.startsWith("/api/")) return gateApiRequest(request);

  if (pathname === "/sw.js") {
    const response = NextResponse.next();
    // no-cache (not no-store) so the SW request doesn't block the bfcache.
    response.headers.set(
      "Cache-Control",
      "no-cache, max-age=0, must-revalidate",
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  const agentRewrite = getAgentRewrite(request);
  if (agentRewrite) return agentRewrite;

  const { locale: localeFromPath, pathnameWithoutLocale } =
    stripLocalePrefix(pathname);
  const localeFromCookie = getLocaleFromCookie(request);

  const localeRedirect = getLocaleRedirect(
    request,
    localeFromPath,
    pathnameWithoutLocale,
    localeFromCookie,
  );
  if (localeRedirect) return localeRedirect;

  // A prefixed path that differs from the cookie updates the cookie.
  const pathLocaleToPersist =
    localeFromPath !== localeFromCookie ? localeFromPath : null;

  const canonicalRedirect = handleCanonicalRedirects(request);
  if (canonicalRedirect) {
    if (pathLocaleToPersist) {
      persistLocaleCookie(canonicalRedirect, pathLocaleToPersist);
    }
    return canonicalRedirect;
  }

  // Both lists are cached for an hour, so this rarely waits on the backend.
  const [placeCheck, categoryRedirectUrl] = await Promise.all([
    checkPlace(request, pathnameWithoutLocale, localeFromPath),
    checkCategory(request, pathnameWithoutLocale, localeFromPath),
  ]);
  const redirectUrl =
    placeCheck?.kind === "alias"
      ? placeCheck.url
      : placeCheck?.kind === "missing"
        ? null
        : categoryRedirectUrl;
  if (redirectUrl) {
    const response = NextResponse.redirect(redirectUrl, 301);
    if (redirectUrl === categoryRedirectUrl) {
      // A new category can be missing from Proxy's list for up to its TTL;
      // without a max-age, browsers may keep this 301 forever. `private`
      // because it may set the NEXT_LOCALE cookie.
      response.headers.set(
        "Cache-Control",
        `private, max-age=${PROXY_LIST_TTL_MS / 1000}`,
      );
    }
    if (pathLocaleToPersist) {
      persistLocaleCookie(response, pathLocaleToPersist);
    }
    return response;
  }

  const locale = localeFromPath ?? DEFAULT_LOCALE;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-next-intl-locale", locale);
  const init = { request: { headers: requestHeaders } };

  // Pages live under app/[locale]/. Prefixed paths (/es/foo) already match;
  // unprefixed ones (/foo) are rewritten to /ca/foo. Unknown places render
  // the same page with a 404 status (NextResponse.next() can't set one).
  const url = request.nextUrl.clone();
  if (!localeFromPath) {
    url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  }
  const response =
    placeCheck?.kind === "missing"
      ? NextResponse.rewrite(url, { ...init, status: 404 })
      : localeFromPath
        ? NextResponse.next(init)
        : NextResponse.rewrite(url, init);

  if (pathLocaleToPersist) {
    persistLocaleCookie(response, pathLocaleToPersist);
  } else if (
    !localeFromPath &&
    localeFromCookie &&
    localeFromCookie !== DEFAULT_LOCALE
  ) {
    // An unprefixed visit means the default locale: clear a stale cookie so
    // the next visit to / doesn't redirect.
    persistLocaleCookie(response, DEFAULT_LOCALE);
  }

  applyCsp(response);
  applyPageHeaders(request, response, pathnameWithoutLocale, locale);
  return response;
}

// Proxy skips Next internals, static files, machine-readable routes (they need
// no locale or CSP), the next.config rewrites (/openapi.json, /.well-known/mcp)
// and Sentry's tunnelRoute (/monitoring, a next.config rewrite that runs after
// Proxy; rewriting it to /ca/monitoring dropped every browser error report).
// Anchored entries ($ or a trailing /) leave place slugs with the same prefix
// alone.
export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|robots\\.txt|sitemap.*\\.xml|server-.*\\.xml|rss\\.xml|llms\\.txt|agent\\.txt|pricing\\.md|ads\\.txt|static|styles|\\.well-known|manifest\\.webmanifest|mcp|agent-view|monitoring$|ask$|openapi(?:\\.json)?$|index\\.md$|docs/).*)",
  ],
};
