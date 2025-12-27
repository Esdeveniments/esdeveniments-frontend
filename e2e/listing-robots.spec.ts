import { test, expect } from "@playwright/test";

test.describe("Listing robots directives", () => {
  test("Query-filter listing URLs are noindex and canonical stays clean", async ({
    page,
  }) => {
    await page.goto("/barcelona?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /follow/i);

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
    await page.goto("/barcelona/avui?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /follow/i);

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
    await page.goto("/barcelona/avui/musica?search=concert", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /follow/i);

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
    await page.goto("/barcelona?distance=10&lat=41.387&lon=2.17", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1, {
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /follow/i);

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
