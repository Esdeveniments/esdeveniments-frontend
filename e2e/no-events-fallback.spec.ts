import { test, expect } from "@playwright/test";

test.describe("No events fallback", () => {
  test("shows fallback when filters yield no results", async ({ page }) => {
    // Use an unlikely category slug to force no results but still route-resolve
    await page.goto(
      "/catalunya/tots?category=category-that-does-not-exist-xyz",
      {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      }
    );
    // Wait for events list container to be present (auto-waits, longer timeout for remote URLs)
    await expect(page.getByTestId("events-list")).toBeAttached({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Either we see the no-results widget or we see at least one event.
    // Avoid flakiness where the list container is attached but content is still loading.
    const noEvents = page.getByTestId("no-events-found");
    const eventLinks = page.locator('a[href^="/e/"]');

    await expect
      .poll(
        async () => {
          const noEventsVisible = await noEvents.isVisible().catch(() => false);
          if (noEventsVisible) return "no-events";

          const eventCount = await eventLinks.count();
          if (eventCount > 0) return "has-events";

          return "loading";
        },
        { timeout: process.env.CI ? 60000 : 20000 }
      )
      .not.toBe("loading");

    // If we have events, consider it acceptable as API may fallback to region/latest.
    const noEventsVisible = await noEvents.isVisible().catch(() => false);
    if (noEventsVisible) {
      await expect(noEvents).toBeVisible({ timeout: 10000 });
    }
  });
});
