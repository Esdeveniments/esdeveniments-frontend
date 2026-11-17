import { describe, expect, it, vi } from "vitest";

// Proxy skips paths like /sitemap_index.xml, so Next hands the text over as
// the locale. Layout and page render in parallel, so each must refuse it
// itself before it looks anything up.
const { rootLocale } = vi.hoisted(() => ({
  rootLocale: vi.fn(async () => "ca"),
}));
vi.mock("next/root-params", () => ({ locale: rootLocale }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(() => new Promise(() => {})),
}));

import Page, { generateMetadata } from "app/[locale]/page";
import LocaleLayout from "app/[locale]/layout";

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";
const notALocale = "sitemap_index.xml";

describe("a value that is not a locale 404s before any work", () => {
  it("in the layout", async () => {
    rootLocale.mockResolvedValueOnce(notALocale);

    await expect(LocaleLayout({ children: null })).rejects.toThrow(NOT_FOUND);
  });

  it("in the home page metadata", async () => {
    rootLocale.mockResolvedValueOnce(notALocale);

    await expect(generateMetadata()).rejects.toThrow(NOT_FOUND);
  });

  it("in the home page", async () => {
    await expect(
      Page({
        params: Promise.resolve({ locale: notALocale }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(NOT_FOUND);
  });
});
