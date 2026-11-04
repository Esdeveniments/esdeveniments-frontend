import { NextResponse, type NextRequest } from "next/server";
import { isDev } from "@utils/api-gate";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type AppLocale,
  SUPPORTED_LOCALES,
} from "types/i18n";

const supportedLocales: ReadonlySet<string> = new Set(SUPPORTED_LOCALES);

export function isSupportedLocale(value: string): value is AppLocale {
  return supportedLocales.has(value);
}

/** Best supported locale from an Accept-Language header, or null. */
export function parseAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;

  let best: { locale: AppLocale; quality: number } | null = null;
  for (const entry of header.split(",")) {
    // RFC 9110 allows optional whitespace around ";" (e.g. "en; q=0.8").
    const [range, ...params] = entry.split(";").map((part) => part.trim());
    const base = range.split("-")[0]?.toLowerCase() ?? "";
    if (!isSupportedLocale(base)) continue;
    const qParam = params.find((param) => /^q=/i.test(param));
    const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    if (!(quality > 0)) continue;
    if (!best || quality > best.quality) best = { locale: base, quality };
  }
  return best?.locale ?? null;
}

export function getLocaleFromCookie(request: NextRequest): AppLocale | null {
  const value = request.cookies?.get?.(LOCALE_COOKIE)?.value;
  return value && isSupportedLocale(value) ? value : null;
}

export function persistLocaleCookie(
  response: NextResponse,
  locale: AppLocale,
): void {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: !isDev,
  });
}

// Stripe promotion return pages: the backend builds them without a locale.
const PROMOTION_RETURN_PATH = /^\/e\/[^/]+\/promote\/(success|cancel)$/;

/**
 * /ca/foo → 308 /foo (the default locale has no prefix); / and the Stripe
 * return pages → 302 to the visitor's preferred locale. Null otherwise.
 */
export function getLocaleRedirect(
  request: NextRequest,
  localeFromPath: AppLocale | null,
  pathnameWithoutLocale: string,
  localeFromCookie: AppLocale | null,
): NextResponse | null {
  const { pathname, search } = request.nextUrl;

  if (localeFromPath === DEFAULT_LOCALE) {
    const response = NextResponse.redirect(
      new URL(`${pathnameWithoutLocale}${search}`, request.url),
      308,
    );
    persistLocaleCookie(response, DEFAULT_LOCALE);
    return response;
  }

  const isPromotionReturn = PROMOTION_RETURN_PATH.test(pathname);
  if (localeFromPath || (pathname !== "/" && !isPromotionReturn)) return null;

  const preferred =
    localeFromCookie ??
    parseAcceptLanguage(request.headers.get("accept-language"));
  if (!preferred || preferred === DEFAULT_LOCALE) return null;

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
