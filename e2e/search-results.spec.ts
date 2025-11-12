import { test, expect } from "@playwright/test";

test.describe("Search end-to-end", () => {
  test("typing updates results list and URL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    // Match by explicit aria-label used in component
    const input = page.getByLabel("Search input").first();
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.click();
    await input.fill("castellers");
    // Wait for debounced navigation
    await expect(page).toHaveURL(/search=castellers/, { timeout: 20000 });
    // Wait for events list container to be present (auto-waits)
    await expect(page.getByTestId("events-list")).toBeAttached({ timeout: 30000 });
    // Expect either results or a no-results indicator
    const anyEvent = page.locator('a[href^="/e/"]').first();
    const eventsList = page.getByTestId("events-list");
    
    // Check if we have events or no-events-found message
    const hasEvents = await anyEvent.isVisible().catch(() => false);
    if (!hasEvents) {
      await expect(page.getByTestId("no-events-found")).toBeVisible({ timeout: 10000 });
    } else {
      // Verify events list is visible if we have events
      await expect(eventsList).toBeVisible({ timeout: 10000 });
    }
  });
});
