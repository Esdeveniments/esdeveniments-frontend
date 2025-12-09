import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_STRATEGY,
  SUPPORTED_LOCALES,
} from "./types/i18n";

const config = {
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: LOCALE_PREFIX_STRATEGY,
};

export default config;
