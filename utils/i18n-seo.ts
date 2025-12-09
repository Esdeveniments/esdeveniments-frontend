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

/**
 * Prefixes a relative path with the locale segment when needed.
 * - Leaves absolute URLs (http, mailto, tel, protocol-relative) untouched.
 * - Leaves non-root relative paths (e.g., "#section", "mailto:") untouched.
 * - For default locale, returns the original path.
 * - Avoids double-prefixing when the path is already localized for the same locale.
 */
export function withLocalePath(path: string, locale: AppLocale): string {
  if (!path) return path;
  // Skip absolute or protocol-relative URLs (e.g., http:, https:, mailto:, tel:, //cdn)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path) || path.startsWith("//")) {
    return path;
  }
  if (!path.startsWith("/")) return path;

  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  if (!prefix) return path;
  if (path === "/") return prefix || "/";
  if (path.startsWith(prefix)) return path;
  return `${prefix}${path}`;
}

export function toLocalizedUrl(path: string, locale: AppLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const urls = buildLocalizedUrls(stripLocaleFromPathname(normalized));
  return urls[locale] ?? `${siteUrl}${normalized === "/" ? "" : normalized}`;
}




