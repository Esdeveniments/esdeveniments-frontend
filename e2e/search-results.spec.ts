import { test, expect } from "@playwright/test";

test.describe("Search end-to-end", () => {
  test("typing updates results list and URL", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Match by explicit aria-label used in component
    const input = page.getByLabel("Search input").first();
    await input.click();
    await input.fill("castellers");
    // Wait for debounce and navigation
    await page.waitForTimeout(1200);
    await expect(page).toHaveURL(/search=castellers/, { timeout: 20000 });
    // Wait for events list container to be present
    await page.waitForSelector('[data-testid="events-list"]', {
      timeout: 30000,
      state: "attached",
    });
    // Expect either results or a no-results indicator
    const anyEvent = page.locator('a[href^="/e/"]').first();
    const hasEvent = await anyEvent.isVisible().catch(() => false);
    if (!hasEvent) {
      const noEvents = page.getByTestId("no-events-found");
      await expect(noEvents).toBeVisible({ timeout: 10000 });
    }
  });
});
