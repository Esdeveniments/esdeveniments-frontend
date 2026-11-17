import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES, type AppLocale } from "types/i18n";

/**
 * The `[locale]` value as an AppLocale, or a 404. Proxy gives every path it
 * runs on a supported locale, but it skips some paths, and when nothing routes
 * one (/sitemap_index.xml) Next matches app/[locale] with that text as the
 * locale. The layout 404s it too, yet it renders in parallel with the page, so
 * a page that looks something up by locale throws a 500 before the 404 wins.
 */
export function requireLocale(locale: string): AppLocale {
  const supported = SUPPORTED_LOCALES.find((candidate) => candidate === locale);
  if (!supported) notFound();
  return supported;
}
