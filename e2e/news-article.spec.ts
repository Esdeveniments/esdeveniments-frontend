import { test, expect } from "@playwright/test";

test.describe("News article pages", () => {
  test("place news index and an article detail render", async ({ page }) => {
    // Navigate to place news index (may redirect or render a list)
    await page.goto("/noticies/barcelona", { waitUntil: "load" });
    // Try to click the first article link if present
    const article = page
      .locator('a[href^="/noticies/barcelona/"]:not([href$="rss.xml"])')
      .first();
    if (await article.isVisible()) {
      const href = await article.getAttribute("href");
      await article.click();
      if (href) {
        const currentOrigin = new URL(page.url()).origin;
        const expectedUrl = href.startsWith("http")
          ? href
          : `${currentOrigin}${href}`;
        await expect(page).toHaveURL(expectedUrl);
      }
      // Basic SEO tags (use .first() — Next.js 16 streaming may render duplicate head tags)
      await expect(
        page.locator('link[rel="canonical"]').first(),
      ).toBeAttached();
      await expect(
        page.locator('meta[property="og:title"]').first(),
      ).toBeAttached();
    } else {
      // If no articles exist, ensure page still renders
      await expect(page).toHaveTitle(/notícies/i);
    }
  });
});
