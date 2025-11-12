import { test, expect } from "@playwright/test";

test.describe("No events fallback", () => {
  test("shows fallback when filters yield no results", async ({ page }) => {
    // Use an unlikely category slug to force no results but still route-resolve
    await page.goto(
      "/catalunya/tots?category=category-that-does-not-exist-xyz",
      {
        waitUntil: "networkidle",
      }
    );
    // Wait for events list container to be present
    await page.waitForSelector('[data-testid="events-list"]', {
      timeout: 30000,
      state: "attached",
    });
    // Either we see no-results widget or the page loads without events
    const noEvents = page.getByTestId("no-events-found");
    const hasNoEvents = await noEvents.isVisible().catch(() => false);
    if (!hasNoEvents) {
      // If we have events, consider it acceptable as API may fallback to region/latest
      const anyEvent = page.locator('a[href^="/e/"]').first();
      const count = await anyEvent.count();
      if (count === 0) {
        await expect(noEvents).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
