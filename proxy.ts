import { NextResponse, type NextRequest } from "next/server";
import { gateApiRequest } from "@utils/api-gate";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { handleCanonicalRedirects } from "@utils/middleware-redirects";
import { getAgentRewrite } from "@utils/proxy-agent";
import { applyCsp } from "@utils/proxy-csp";
import {
  getLocaleFromCookie,
  parseAcceptLanguage,
  persistLocaleCookie,
} from "@utils/proxy-locale";
import { getLoginEntryRedirect } from "@utils/proxy-login";
import { applyPageHeaders } from "@utils/proxy-page-headers";
import { DEFAULT_LOCALE } from "types/i18n";

// Stripe promotion return pages: the backend builds them without a locale.
const PROMOTION_RETURN_PATH = /^\/e\/[^/]+\/promote\/(success|cancel)$/;

// Static headers, trust-page redirects and the /openapi.json and
// /.well-known/mcp rewrites live in next.config.js. This file only holds
// per-request logic.
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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

  // The default locale has no prefix: /ca/foo → /foo.
  if (localeFromPath === DEFAULT_LOCALE) {
    const response = NextResponse.redirect(
      new URL(`${pathnameWithoutLocale}${search}`, request.url),
      308,
    );
    persistLocaleCookie(response, DEFAULT_LOCALE);
    return response;
  }

  // Send / and the Stripe return pages to the visitor's preferred locale.
  const isPromotionReturn = PROMOTION_RETURN_PATH.test(pathname);
  if (!localeFromPath && (pathname === "/" || isPromotionReturn)) {
    const preferred =
      localeFromCookie ??
      parseAcceptLanguage(request.headers.get("accept-language"));
    if (preferred && preferred !== DEFAULT_LOCALE) {
      const response = NextResponse.redirect(
        new URL(
          `/${preferred}${isPromotionReturn ? pathname : ""}${search}`,
          request.url,
        ),
        302,
      );
      persistLocaleCookie(response, preferred);
      return response;
    }
  }

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

  const locale = localeFromPath ?? DEFAULT_LOCALE;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-next-intl-locale", locale);
  const init = { request: { headers: requestHeaders } };

  // Pages live under app/[locale]/. Prefixed paths (/es/foo) already match;
  // unprefixed ones (/foo) are rewritten to /ca/foo.
  let response: NextResponse;
  if (localeFromPath) {
    response = NextResponse.next(init);
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
    response = NextResponse.rewrite(url, init);
  }

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
