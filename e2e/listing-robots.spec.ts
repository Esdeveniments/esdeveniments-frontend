import { test, expect } from "@playwright/test";

test.describe("Listing robots directives", () => {
  // Note: robots directives for filtered URLs are now sent via X-Robots-Tag HTTP header
  // (not meta tag) to avoid making pages dynamic and causing DynamoDB cost spikes.
  // See: AGENTS.md section "ISR/Caching Cost Prevention"

  test("Query-filter listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    // Capture the response to check headers
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona") && resp.url().includes("search=")
    );

    await page.goto("/barcelona?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    expect(robotsHeader).toMatch(/noindex/i);
    expect(robotsHeader).toMatch(/follow/i);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });

    const canonicalHref = (await canonical.getAttribute("href")) ?? "";
    expect(canonicalHref).not.toContain("?");

    // Be tolerant of absolute vs relative canonicals.
    const canonicalUrl = new URL(canonicalHref, page.url());
    expect(canonicalUrl.pathname).toMatch(/\/barcelona$/);
  });

  test("Query-filter place+date listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona/avui") && resp.url().includes("search=")
    );

    await page.goto("/barcelona/avui?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    expect(robotsHeader).toMatch(/noindex/i);
    expect(robotsHeader).toMatch(/follow/i);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });

    const canonicalHref = (await canonical.getAttribute("href")) ?? "";
    expect(canonicalHref).not.toContain("?");

    const canonicalUrl = new URL(canonicalHref, page.url());
    expect(canonicalUrl.pathname).toMatch(/\/barcelona\/avui$/);
  });

  test("Query-filter place+date+category listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona/avui/musica") &&
        resp.url().includes("search=")
    );

    await page.goto("/barcelona/avui/musica?search=concert", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    expect(robotsHeader).toMatch(/noindex/i);
    expect(robotsHeader).toMatch(/follow/i);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });

    const canonicalHref = (await canonical.getAttribute("href")) ?? "";
    expect(canonicalHref).not.toContain("?");

    const canonicalUrl = new URL(canonicalHref, page.url());
    expect(canonicalUrl.pathname).toMatch(/\/barcelona\/avui\/musica$/);
  });

  test("Geo/distance listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/barcelona") && resp.url().includes("distance=")
    );

    await page.goto("/barcelona?distance=10&lat=41.387&lon=2.17", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const response = await responsePromise;
    const robotsHeader = response.headers()["x-robots-tag"];
    expect(robotsHeader).toMatch(/noindex/i);
    expect(robotsHeader).toMatch(/follow/i);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });

    const canonicalHref = (await canonical.getAttribute("href")) ?? "";
    expect(canonicalHref).not.toContain("?");

    const canonicalUrl = new URL(canonicalHref, page.url());
    expect(canonicalUrl.pathname).toMatch(/\/barcelona$/);
  });
});
