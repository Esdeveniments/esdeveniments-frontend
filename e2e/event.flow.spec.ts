import { test, expect } from "@playwright/test";

// Event flow: visit sitemap, try to open some event. If none, verify 404 page renders on fake slug.

test.describe("Event detail flow", () => {
  test("open an event card when available or show not-found", async ({
    page,
  }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    // Click first region/city link if present (prefer stable testids)
    const firstLink = page.getByTestId("sitemap-region-link").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      // Try a city link (sitemap navigation) as a second step
      const monthLink = page.getByTestId("sitemap-city-link").first();
      if (await monthLink.isVisible()) {
        await monthLink.click();
        const eventLink = page.locator('a[href^="/e/"]').first();
        if (await eventLink.isVisible()) {
          await eventLink.click();
          // Event header/title should be visible
          await expect(page.locator("h1")).toBeVisible();
          return;
        }
      }
    }
    // Fallback: navigate to a non-existent event
    await page.goto("/e/non-existent-event-slug-12345", {
      waitUntil: "domcontentloaded",
    });
    // Accept either site-wide not-found or event-specific noEventFound component
    const notFoundTitle = page.getByTestId("not-found-title");
    const noEventFound = page.getByTestId("no-event-found");
    await expect(notFoundTitle.or(noEventFound)).toBeVisible();
  });
});
