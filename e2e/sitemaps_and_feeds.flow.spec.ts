import { test, expect } from "@playwright/test";

// Validate sitemap index and town pages render, and server sitemap + RSS endpoints respond 200.

test.describe("Sitemaps and feed", () => {
  test("sitemap index renders", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("sitemap-page")).toBeVisible();
    await expect(page.getByTestId("sitemap-title")).toBeVisible();
  });

  test("server sitemap responds", async ({ request }) => {
    const res = await request.get("/server-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");
  });

  test("rss feed responds", async ({ request }) => {
    const res = await request.get("/rss.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<?xml");
  });
});
