export const SUPPORTED_LOCALES = ["ca", "es", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ca";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_PREFIX_STRATEGY = "as-needed" as const;

export const localeToOgLocale: Record<AppLocale, string> = {
  ca: "ca-ES",
  es: "es-ES",
  en: "en-US",
};

export const localeToHrefLang: Record<AppLocale, string> = {
  ca: "ca",
  es: "es",
  en: "en",
};
