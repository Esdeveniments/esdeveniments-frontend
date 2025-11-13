import { test, expect } from "@playwright/test";

test.describe("Search behavior", () => {
  test("debounced typing updates URL; Enter submits immediately; clear resets", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const input = page.getByTestId("search-input");
    await expect(input).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });

    // On home, search navigates to /catalunya/; start by ensuring we are on that path after focusing the input
    await input.fill("");
    await input.type("castellers");
    
    // Verify URL doesn't update immediately (debounce delay)
    await expect
      .poll(async () => page.url(), { timeout: 500, intervals: [100] })
      .not.toContain("search=castellers");

    // Wait for debounced navigation - poll until URL contains search param
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=castellers");

    // Press Enter for immediate submit on same path
    await input.fill("sardanes");
    await input.press("Enter");
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=sardanes");

    // Clear search via UI clear control if present, otherwise programmatically
    // We rely on value reset to propagate URL clearing
    await input.fill("");
    // Wait for debounced URL clearing - poll until search param is removed
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .not.toContain("search=");
  });
});
