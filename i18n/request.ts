import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "../types/i18n";

const messagesLoaders: Record<AppLocale, () => Promise<AbstractIntlMessages>> = {
  ca: () =>
    import("../messages/ca.json").then(
      (mod) => mod.default as unknown as AbstractIntlMessages
    ),
  es: () =>
    import("../messages/es.json").then(
      (mod) => mod.default as unknown as AbstractIntlMessages
    ),
  en: () =>
    import("../messages/en.json").then(
      (mod) => mod.default as unknown as AbstractIntlMessages
    ),
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  const resolvedLocale = locale && SUPPORTED_LOCALES.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : DEFAULT_LOCALE;

  const messages = await messagesLoaders[resolvedLocale]();

  return {
    locale: resolvedLocale,
    messages,
  };
});
