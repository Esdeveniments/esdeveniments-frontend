import { test, expect } from "@playwright/test";

test.describe("Location-based archive journey", () => {
  test("sitemap town/year/month renders and links to events", async ({
    page,
  }) => {
    // Try a common case; if backend has no data, ensure page still loads
    await page.goto("/sitemap/barcelona/2024/juliol", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Header or NoEventsFound should render; assert page did not 500
    await expect(page.getByTestId("app-content")).toBeVisible({ timeout: 30000 });

    const eventLink = page.locator('a[href^="/e/"]').first();
    if (await eventLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await eventLink.click();
      await expect(page.locator("h1")).toBeVisible({ timeout: 30000 });
    }
  });
});
