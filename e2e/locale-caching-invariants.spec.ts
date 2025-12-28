import { test, expect } from "@playwright/test";

import { LOCALE_COOKIE } from "../types/i18n";

test.describe("Locale caching invariants", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("/ redirects to locale-prefixed URL for non-default accept-language", async ({
    browser,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();

    const contextEs = await browser.newContext({
      extraHTTPHeaders: { "accept-language": "es" },
    });
    const pageEs = await contextEs.newPage();

    const response = await pageEs.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    if (!response) {
      throw new Error("Navigation to '/' did not return a response");
    }

    const headers = await response.allHeaders();
    const hasProxyHeaders = Boolean(
      headers["content-security-policy"] ||
        headers["content-security-policy-report-only"]
    );

    test.skip(
      !hasProxyHeaders,
      "proxy.ts not active in this environment (e.g. plain next dev)"
    );

    const currentUrl = pageEs.url();
    if (/\/es(\/|$)/.test(currentUrl)) {
      // OK: locale is separated by URL, safe for CDN caching.
      await expect(pageEs).toHaveURL(/\/es(\/|$)/);
    } else {
      // If no redirect happened, the safety invariant is: '/' must remain default locale.
      const contentLanguage = headers["content-language"];
      expect(contentLanguage).toBe("ca");
    }

    await contextEs.close();
  });

  test("unprefixed paths do not vary by locale cookie or accept-language", async ({
    browser,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();

    const contextDefault = await browser.newContext({
      extraHTTPHeaders: { "accept-language": "ca" },
    });
    const pageDefault = await contextDefault.newPage();

    const responseDefault = await pageDefault.goto("/catalunya", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    if (!responseDefault) {
      throw new Error("Navigation to '/catalunya' did not return a response");
    }

    const headersDefault = await responseDefault.allHeaders();
    const cacheDefault = headersDefault["cache-control"];
    const contentLangDefault = headersDefault["content-language"];

    const hasProxyHeaders = Boolean(
      headersDefault["content-security-policy"] ||
        headersDefault["content-security-policy-report-only"]
    );
    test.skip(
      !hasProxyHeaders,
      "proxy.ts not active in this environment (e.g. plain next dev)"
    );

    expect(contentLangDefault).toBe("ca");

    if (!cacheDefault) {
      throw new Error("Missing 'cache-control' header on default locale response");
    }

    const contextWithLocaleCookie = await browser.newContext({
      extraHTTPHeaders: { "accept-language": "es" },
    });

    await contextWithLocaleCookie.addCookies([
      {
        name: LOCALE_COOKIE,
        value: "es",
        url: baseURL!,
      },
    ]);

    const pageCookie = await contextWithLocaleCookie.newPage();
    const responseCookie = await pageCookie.goto("/catalunya", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    if (!responseCookie) {
      throw new Error("Navigation to '/catalunya' did not return a response (cookie context)");
    }

    const headersCookie = await responseCookie.allHeaders();
    const cacheCookie = headersCookie["cache-control"];
    const contentLangCookie = headersCookie["content-language"];

    // Key invariant: same URL => same locale (no CDN variant mixing).
    expect(contentLangCookie).toBe("ca");

    // If the environment emits CDN caching headers, keep them stable.
    const looksLikeCdnCaching =
      cacheDefault.includes("public") || cacheDefault.includes("s-maxage=");

    if (looksLikeCdnCaching) {
      expect(cacheCookie).toContain("public");
      expect(cacheCookie).toContain("s-maxage=300");
    } else {
      // Dev often forces no-store; still ensure cookie doesn't change caching semantics.
      expect(cacheCookie).toBe(cacheDefault);
    }

    await contextDefault.close();
    await contextWithLocaleCookie.close();
  });
});
