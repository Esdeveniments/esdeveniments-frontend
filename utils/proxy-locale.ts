import type { NextRequest, NextResponse } from "next/server";
import { isDev } from "@utils/api-gate";
import {
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
