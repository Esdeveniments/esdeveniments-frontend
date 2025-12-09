import { siteUrl } from "@config/index";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "types/i18n";

export function getSafePathname(canonical: string): string {
  try {
    const parsed = new URL(canonical);
    return parsed.pathname || "/";
  } catch {
    return canonical.startsWith("/") ? canonical : "/";
  }
}

export function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length > 0 &&
    SUPPORTED_LOCALES.includes(segments[0] as AppLocale)
  ) {
    const remainder = segments.slice(1).join("/");
    return remainder ? `/${remainder}` : "/";
  }
  return pathname || "/";
}

export function buildLocalizedUrls(pathname: string): Record<AppLocale, string> {
  const normalizedPath = pathname === "/" ? "" : pathname;
  return SUPPORTED_LOCALES.reduce<Record<AppLocale, string>>((acc, locale) => {
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
    acc[locale] = `${siteUrl}${prefix}${normalizedPath}`;
    return acc;
  }, {} as Record<AppLocale, string>);
}

export function applyLocaleToCanonical(
  canonical: string,
  locale: AppLocale
): string {
  if (locale === DEFAULT_LOCALE) return canonical;
  try {
    const parsed = new URL(canonical);
    const pathname = parsed.pathname || "/";
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === locale) {
      return canonical;
    }
    const normalizedPath = pathname === "/" ? "" : pathname;
    parsed.pathname = `/${locale}${normalizedPath}`;
    return parsed.toString();
  } catch {
    if (canonical.startsWith("/")) {
      const firstSegment = canonical.split("/").filter(Boolean)[0];
      if (firstSegment === locale) {
        return canonical;
      }
      return `/${locale}${canonical}`;
    }
    return canonical;
  }
}

export function resolveLocaleFromHeaders(
  headersLike?:
    | Headers
    | null
    | undefined
    | {
        get?: (name: string) => string | null;
      }
): AppLocale {
  const value = headersLike?.get?.("x-next-intl-locale");
  if (value && SUPPORTED_LOCALES.includes(value as AppLocale)) {
    return value as AppLocale;
  }
  return DEFAULT_LOCALE;
}

export function toLocalizedUrl(path: string, locale: AppLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const urls = buildLocalizedUrls(stripLocaleFromPathname(normalized));
  return urls[locale] ?? `${siteUrl}${normalized === "/" ? "" : normalized}`;
}



