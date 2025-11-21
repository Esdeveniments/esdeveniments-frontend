import { test, expect } from "@playwright/test";

test.describe("Home flow", () => {
  test("renders home and search input", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    // Auto-waiting assertion - no need for manual waits
    await expect(page.getByTestId("search-input")).toBeVisible({
      timeout: 30000,
    });
  });

  test("displays categorized events correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    // Wait for search input to ensure page is loaded
    await expect(page.getByTestId("search-input")).toBeVisible({
      timeout: 30000,
    });

    // Verify that categorized events are actually displayed
    // Categorized events are rendered via EventsAroundServer which creates event links
    // The API call happens server-side, so we verify the outcome (events displayed)
    const eventLinks = page.locator('a[href^="/e/"]');

    // Wait for events to be rendered (with longer timeout for CI)
    // If getInternalApiUrl() returns wrong URL, server-side fetch fails,
    // categorizedEvents would be empty {}, and we'd see no-events-found instead
    await expect(eventLinks.first()).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Verify we have at least one event link
    // This confirms that fetchCategorizedEvents() succeeded and returned data
    const eventCount = await eventLinks.count();
    expect(eventCount).toBeGreaterThan(0);

    // Verify no-events-found is NOT displayed (since we have events)
    // If the API call failed, categorizedEvents would be {} and no-events-found would show
    const noEventsFound = page.getByTestId("no-events-found");
    await expect(noEventsFound).not.toBeVisible();

    // Verify that each "Veure més" link points to a valid canonical path
    // Category links are under /catalunya/, featured place links are direct /place
    const seeMoreLinks = page.getByRole("link", { name: /Veure més/i });
    const seeMoreCount = await seeMoreLinks.count();
    expect(seeMoreCount).toBeGreaterThan(0);

    for (let index = 0; index < seeMoreCount; index += 1) {
      const href = await seeMoreLinks.nth(index).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toContain("%20");
      // Allow both patterns: /catalunya/... for categories and /place for featured places
      expect(href).toMatch(/^\/(catalunya\/[a-z0-9-]+|[a-z0-9-]+)$/);
    }
  });
});
