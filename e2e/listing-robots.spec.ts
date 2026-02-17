import { test, expect } from "@playwright/test";

test.describe("Listing robots directives", () => {
  // Note: robots directives for filtered URLs are now sent via X-Robots-Tag HTTP header
  // (not meta tag) to avoid making pages dynamic and causing DynamoDB cost spikes.
  // See: AGENTS.md section "ISR/Caching Cost Prevention"

  /**
   * Assert that at least one canonical exists, has no query string,
   * and its pathname matches the expected pattern.
   *
   * Next.js 16 streaming / ISR may occasionally render a duplicate
   * <link rel="canonical"> (environment artifact). We use .first() so the
   * test validates correctness without being flaky due to framework quirks.
   */
  async function assertCanonical(
    page: import("@playwright/test").Page,
    pathnamePattern: RegExp,
  ) {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical.first()).toBeAttached({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const canonicalHref = (await canonical.first().getAttribute("href")) ?? "";
    expect(canonicalHref).not.toContain("?");

    // Be tolerant of absolute vs relative canonicals.
    const canonicalUrl = new URL(canonicalHref, page.url());
    expect(canonicalUrl.pathname).toMatch(pathnamePattern);
  }

  test("Query-filter listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    // Capture the response to check headers
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona") && resp.url().includes("search="),
    );

    await page.goto("/barcelona?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    // Note: Vercel preview deployments may override X-Robots-Tag with just "noindex"
    // (stripping "follow"), so we only verify the critical noindex directive
    expect(robotsHeader).toMatch(/noindex/i);

    await assertCanonical(page, /\/barcelona$/);
  });

  test("Query-filter place+date listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona/avui") &&
        resp.url().includes("search="),
    );

    await page.goto("/barcelona/avui?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    // Note: Vercel preview deployments may override X-Robots-Tag with just "noindex"
    // (stripping "follow"), so we only verify the critical noindex directive
    expect(robotsHeader).toMatch(/noindex/i);

    await assertCanonical(page, /\/barcelona\/avui$/);
  });

  test("Query-filter place+date+category listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona/avui/musica") &&
        resp.url().includes("search="),
    );

    await page.goto("/barcelona/avui/musica?search=concert", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    // Note: Vercel preview deployments may override X-Robots-Tag with just "noindex"
    // (stripping "follow"), so we only verify the critical noindex directive
    expect(robotsHeader).toMatch(/noindex/i);

    await assertCanonical(page, /\/barcelona\/avui\/musica$/);
  });

  test("Geo/distance listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona") && resp.url().includes("distance="),
    );

    await page.goto("/barcelona?distance=10&lat=41.387&lon=2.17", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    // Note: Vercel preview deployments may override X-Robots-Tag with just "noindex"
    // (stripping "follow"), so we only verify the critical noindex directive
    expect(robotsHeader).toMatch(/noindex/i);

    await assertCanonical(page, /\/barcelona$/);
  });
});
