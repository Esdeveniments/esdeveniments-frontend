import { describe, expect, it } from "vitest";
import { requireLocale } from "@lib/i18n/require-locale";

describe("requireLocale", () => {
  it.each(["ca", "es", "en"])("returns the supported locale %s", (locale) => {
    expect(requireLocale(locale)).toBe(locale);
  });

  // What Next puts in [locale] when no route matches a path Proxy skips.
  it.each(["sitemap_index.xml", "staticfoo", "CA", ""])(
    "404s the unsupported locale %j",
    (locale) => {
      expect(() => requireLocale(locale)).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    },
  );
});
