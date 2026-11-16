import localesConfig from "../config/locales.json";

export type AppLocale = keyof typeof localesConfig.locales;

export const SUPPORTED_LOCALES = Object.keys(
  localesConfig.locales,
) as readonly AppLocale[];

export const DEFAULT_LOCALE = "ca" satisfies AppLocale;

export type NonDefaultLocale = Exclude<AppLocale, typeof DEFAULT_LOCALE>;

export const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(
  (locale): locale is NonDefaultLocale => locale !== DEFAULT_LOCALE,
);

export const LOCALE_NAMES: Record<AppLocale, string> = localesConfig.locales;

export const DEEPL_TARGET_LANG: Record<NonDefaultLocale, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_PREFIX_STRATEGY = "as-needed" as const;

export const localeToOgLocale: Record<AppLocale, string> = {
  ca: "ca-ES",
  es: "es-ES",
  en: "en-US",
  fr: "fr-FR",
};

export const localeToHrefLang: Record<AppLocale, string> = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, locale]),
) as Record<AppLocale, string>;
