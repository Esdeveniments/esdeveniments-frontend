import { test, expect } from "@playwright/test";

const FAVORITES_COOKIE_NAME = "user_favorites";

test.describe("Cache-Control with favorites cookie", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("favorites cookie does not force private HTML caching", async ({
    browser,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();

    const contextWithoutCookie = await browser.newContext();
    const pageWithoutCookie = await contextWithoutCookie.newPage();
    const responseWithoutCookie = await pageWithoutCookie.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    expect(responseWithoutCookie).not.toBeNull();

    const cacheControlWithoutCookie = (
      await responseWithoutCookie!.allHeaders()
    )["cache-control"];
    expect(cacheControlWithoutCookie).toBeTruthy();

    const contextWithCookie = await browser.newContext();
    await contextWithCookie.addCookies([
      {
        name: FAVORITES_COOKIE_NAME,
        value: JSON.stringify(["some-slug"]),
        url: baseURL!,
      },
    ]);

    const pageWithCookie = await contextWithCookie.newPage();
    const responseWithCookie = await pageWithCookie.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    expect(responseWithCookie).not.toBeNull();

    const cacheControlWithCookie = (await responseWithCookie!.allHeaders())[
      "cache-control"
    ];
    expect(cacheControlWithCookie).toBeTruthy();

    // Regression guard: the favorites cookie must NOT be the reason a page becomes private.
    // Some CI/preview layers may already force private/no-store for all HTML.
    const baselineIsPrivate = cacheControlWithoutCookie.includes("private");
    if (!baselineIsPrivate) {
      expect(cacheControlWithCookie).not.toContain("private");
    }

    // In environments where we do emit CDN caching headers, ensure they're preserved.
    const looksLikeCdnCaching =
      cacheControlWithoutCookie.includes("public") ||
      cacheControlWithoutCookie.includes("s-maxage=");
    if (looksLikeCdnCaching) {
      expect(cacheControlWithCookie).toContain("public");
      expect(cacheControlWithCookie).toContain("s-maxage=1800");
    } else {
      // Dev often forces no-store. Still ensure cookie doesn't change caching semantics.
      expect(cacheControlWithCookie).toBe(cacheControlWithoutCookie);
    }

    const favoritesResponse = await pageWithCookie.goto("/preferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    expect(favoritesResponse).not.toBeNull();

    const favoritesCacheControl = (await favoritesResponse!.allHeaders())[
      "cache-control"
    ];
    expect(favoritesCacheControl).toBeTruthy();
    expect(favoritesCacheControl).toContain("no-store");
    if (looksLikeCdnCaching) {
      expect(favoritesCacheControl).toContain("private");
    }

    await contextWithoutCookie.close();
    await contextWithCookie.close();
  });
});
