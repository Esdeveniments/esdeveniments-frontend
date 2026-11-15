import { test, expect, type Page } from "@playwright/test";

// staleTimes.dynamic (next.config.js) keeps visited pages in the router cache,
// so a link back to one opens with no request and no skeleton.
function countPageRequests(page: Page, pathname: string): () => number {
  let count = 0;
  page.on("request", (req) => {
    const headers = req.headers();
    if (!headers["rsc"] || headers["next-router-prefetch"]) return;
    if (new URL(req.url()).pathname === pathname) count++;
  });
  return () => count;
}

test.describe("Router cache", () => {
  test("a link back to a page seen a moment ago makes no request", async ({
    page,
  }) => {
    test.setTimeout(45000);
    const favoritesRequests = countPageRequests(page, "/preferits");

    // domcontentloaded, not networkidle: ads and analytics never settle.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const favoritesLink = page
      .locator('nav a[href="/preferits"]')
      .filter({ visible: true })
      .first();
    await expect(favoritesLink).toBeVisible();

    await favoritesLink.click();
    await page.waitForURL(/\/preferits$/);
    await expect(page.locator("main h1").filter({ visible: true }).first()).toBeVisible();
    expect(favoritesRequests()).toBe(1);

    await page.locator('nav a[href="/"]').filter({ visible: true }).first().click();
    await page.waitForURL((url) => url.pathname === "/");

    await favoritesLink.click();
    await page.waitForURL(/\/preferits$/);
    await expect(page.locator("main h1").filter({ visible: true }).first()).toBeVisible();
    expect(favoritesRequests()).toBe(1);
  });
});
