import { test, expect } from "@playwright/test";

test.describe("Search end-to-end", () => {
  test("typing updates results list and URL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    // Match by explicit aria-label used in component
    const input = page.getByLabel("Search input").first();
    await expect(input).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
    await input.click();
    await input.fill("castellers");
    // Click search button to trigger search (search component requires button click or Enter)
    const searchButton = page.getByTestId("search-button");
    await searchButton.click();
    // Wait for navigation - on home page, search navigates to /catalunya?search=...
    await expect(page).toHaveURL(/\/catalunya\?search=castellers/, { timeout: process.env.CI ? 40000 : 20000 });
    // Wait for events list container to be present (auto-waits, longer timeout for remote URLs)
    await expect(page.getByTestId("events-list")).toBeAttached({ timeout: process.env.CI ? 60000 : 30000 });
    // Expect either results or a no-results indicator
    const anyEvent = page.locator('a[href^="/e/"]').first();
    const eventsList = page.getByTestId("events-list");
    
    // Check if we have events or no-events-found message
    const hasEvents = await anyEvent.isVisible().catch(() => false);
    if (!hasEvents) {
      await expect(page.getByTestId("no-events-found")).toBeVisible({ timeout: process.env.CI ? 30000 : 10000 });
    } else {
      // Verify events list is visible if we have events
      await expect(eventsList).toBeVisible({ timeout: process.env.CI ? 30000 : 10000 });
    }
  });
});
