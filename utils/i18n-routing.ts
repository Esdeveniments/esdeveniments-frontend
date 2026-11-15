import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
  type NonDefaultLocale,
} from "types/i18n";

export function stripLocalePrefix(pathname: string): {
  locale: AppLocale | null;
  pathnameWithoutLocale: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { locale: null, pathnameWithoutLocale: "/" };
  }
  const supported = new Set<AppLocale>(SUPPORTED_LOCALES);
  const first = segments[0];
  if (supported.has(first as AppLocale)) {
    const remainder = segments.slice(1).join("/");
    return {
      locale: first as AppLocale,
      pathnameWithoutLocale: remainder ? `/${remainder}` : "/",
    };
  }
  return { locale: null, pathnameWithoutLocale: pathname || "/" };
}

export function normalizePathname(pathname: string): string {
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname);
  return pathnameWithoutLocale || "/";
}

export function ensureLocale(locale: string | null | undefined): AppLocale {
  if (locale && SUPPORTED_LOCALES.includes(locale as AppLocale)) {
    return locale as AppLocale;
  }
  return DEFAULT_LOCALE;
}

export function isNonDefaultLocale(
  locale: string | null | undefined,
): locale is NonDefaultLocale {
  return Boolean(
    locale &&
      locale !== DEFAULT_LOCALE &&
      SUPPORTED_LOCALES.includes(locale as AppLocale),
  );
}

/**
 * Canonicalizes a BCP-47 locale tag with standard ECMA-402 `Intl.getCanonicalLocales`
 * and `Intl.Locale` (`"en-gb"` -> `"en-GB"`, `"zh-hans"` -> `"zh-Hans"`).
 * Restricts the primary language subtag to ISO 639 (2-3 letters), rejecting
 * prototype words like `"toString"`, `"valueOf"`, or `"constructor"`.
 */
export function canonicalizeLocaleTag(
  raw: string | null | undefined,
): { canonical: string; language: string } | null {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length > 35) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(trimmed);
    if (!canonical) return null;
    const { language } = new Intl.Locale(canonical);
    if (!language || language.length < 2 || language.length > 3) return null;
    return { canonical, language };
  } catch {
    return null;
  }
}

/**
 * Prefixes a relative root path with the locale segment when needed.
 * Matches a complete locale segment so towns like `/esparreguera` still get `/es`.
 */
export function localizePath(path: string, locale: AppLocale): string {
  if (!path) return path;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path) || path.startsWith("//")) {
    return path;
  }
  if (!path.startsWith("/")) return path;

  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : path.slice(suffixIndex);

  const { locale: existingLocale } = stripLocalePrefix(pathname);
  if (existingLocale !== null) return path;

  if (locale === DEFAULT_LOCALE) return path;
  if (pathname === "/") return `/${locale}${suffix}`;
  return `/${locale}${pathname}${suffix}`;
}

/**
 * Builds the `/iniciar-sessio` href with a locale-preserving `?redirect=` path.
 * `@i18n/routing` `<Link>` and `ActiveLink` add the locale prefix to `/iniciar-sessio`
 * itself, while Logto callback reads the return locale from `?redirect=`.
 */
export function buildLoginHref(
  returnPath: string | null | undefined,
  locale: AppLocale,
): `/iniciar-sessio${string}` {
  if (!returnPath || !returnPath.startsWith("/")) {
    return "/iniciar-sessio";
  }
  const localizedReturn = localizePath(returnPath, locale);
  const suffixIndex = localizedReturn.search(/[?#]/);
  const pathname =
    suffixIndex === -1
      ? localizedReturn
      : localizedReturn.slice(0, suffixIndex);
  const hasQuery = localizedReturn.includes("?");
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname);
  if (
    pathnameWithoutLocale === "/iniciar-sessio" ||
    (pathnameWithoutLocale === "/" && !hasQuery)
  ) {
    return "/iniciar-sessio";
  }
  return `/iniciar-sessio?redirect=${encodeURIComponent(localizedReturn)}`;
}



