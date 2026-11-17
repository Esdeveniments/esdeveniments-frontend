import type { ReactNode } from "react";

export const SUPPORTED_LOCALES = ["ca", "es", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ca";

export type NonDefaultLocale = Exclude<AppLocale, typeof DEFAULT_LOCALE>;

export const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(
  (locale): locale is NonDefaultLocale => locale !== DEFAULT_LOCALE,
);

export const DEEPL_TARGET_LANG: Record<NonDefaultLocale, string> = {
  es: "ES",
  en: "EN",
};

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

/** Routes whose client components need messages the root provider leaves out. */
export type RouteMessagesScope =
  | "publish"
  | "eventEdit"
  | "eventPromote"
  | "editProfile"
  | "profile"
  | "sponsorship";

export interface RouteClientMessagesProps {
  scope: RouteMessagesScope;
  children: ReactNode;
}

export interface ScopedMessagesProviderProps {
  messages: Record<string, unknown>;
  children: ReactNode;
}
