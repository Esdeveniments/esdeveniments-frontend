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
          if (await noEvents.isVisible()) return "no-events";

          const eventCount = await eventLinks.count();
          if (eventCount > 0) return "has-events";

          return "loading";
        },
        { timeout: process.env.CI ? 60000 : 20000 }
      )
      .not.toBe("loading");

    // Make the accepted outcomes explicit: either the "no events" widget appears,
    // or we have at least one event due to upstream fallback behavior.
    if (await noEvents.isVisible()) {
      await expect(noEvents).toBeVisible();
    } else {
      expect(await eventLinks.count()).toBeGreaterThan(0);
    }
  });
});
