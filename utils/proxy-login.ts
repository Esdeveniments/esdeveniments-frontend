import { NextResponse, type NextRequest } from "next/server";
import { sanitizeReturnTo } from "@utils/redirect-safety";
import { isSupportedLocale } from "@utils/proxy-locale";
import { DEFAULT_LOCALE } from "types/i18n";

// Localized sign-in entry route (with or without a locale prefix), e.g.
// /iniciar-sessio, /ca/iniciar-sessio, /es/iniciar-sessio. Captures the locale.
const LOGIN_ENTRY_PATTERN = /^\/(?:([a-z]{2})\/)?iniciar-sessio\/?$/;

/**
 * Forward the localized /iniciar-sessio route into the Logto OIDC flow.
 * Done in Proxy (not the page) because cacheComponents would otherwise
 * prerender the page's redirect() into a meta-refresh. Keeps only a safe local
 * ?redirect= target (no protocol-relative or backslash tricks).
 */
export function getLoginEntryRedirect(
  request: NextRequest,
): NextResponse | null {
  // GET only: the 307 keeps the method, and /api/auth/sign-in is a GET-only
  // public route (HEAD/other methods would hit the HMAC guard).
  if (request.method !== "GET") return null;

  const match = request.nextUrl.pathname.match(LOGIN_ENTRY_PATTERN);
  if (!match) return null;
  // The pattern captures any 2-letter prefix; for one that isn't a real locale
  // (e.g. /fr/...) fall through so Next 404s instead of 307-ing into the flow.
  const captured = match[1];
  if (captured && !isSupportedLocale(captured)) return null;

  const locale = captured ?? DEFAULT_LOCALE;
  // Default to the localized home so a user browsing in es/en isn't bounced
  // to the default locale after signing in.
  const localizedHome = locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
  const target = new URL("/api/auth/sign-in", request.nextUrl.origin);
  target.searchParams.set(
    "redirect",
    sanitizeReturnTo(request.nextUrl.searchParams.get("redirect")) ??
      localizedHome,
  );
  // Logto renders its hosted page in this locale (ui_locales).
  target.searchParams.set("locale", locale);

  const response = NextResponse.redirect(target, 307);
  // This route used to be a noindex page; keep it out of search results.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
