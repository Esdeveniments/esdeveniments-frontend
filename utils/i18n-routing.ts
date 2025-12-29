import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
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



