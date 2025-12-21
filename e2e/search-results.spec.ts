import { test, expect } from "@playwright/test";

test.describe("Search end-to-end", () => {
  test("typing updates results list and URL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    // Match by explicit data-testid used in component
    const input = page.getByTestId("search-input");
    await expect(input).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
    await input.click();
    await input.fill("castellers");
    // Click search button to trigger search (search component requires button click or Enter)
    const searchButton = page.getByTestId("search-button");
    await searchButton.click();
    // Wait for navigation - on home page, search navigates to /catalunya?search=...
    await expect(page).toHaveURL(/\/catalunya\?search=castellers/, {
      timeout: process.env.CI ? 40000 : 20000,
    });
    // Wait for either events list or the no-results indicator
    await page.waitForSelector(
      '[data-testid="events-list"], [data-testid="no-events-found"]',
      {
        timeout: process.env.CI ? 60000 : 30000,
      }
    );

    const anyEvent = page.locator('a[href^="/e/"]');
    const eventsList = page.getByTestId("events-list");
    const noEvents = page.getByTestId("no-events-found");

    // Prefer events when present; if not, fall back to no-events indicator
    const noEventsVisible = await noEvents
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (noEventsVisible) {
      await expect(noEvents).toBeVisible({
        timeout: process.env.CI ? 30000 : 10000,
      });
    } else {
      await expect(eventsList).toBeVisible({
        timeout: process.env.CI ? 30000 : 10000,
      });
      const eventCount = await anyEvent.count();
      expect(eventCount).toBeGreaterThan(0);
    }
  });
});
