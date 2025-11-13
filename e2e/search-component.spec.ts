import { test, expect } from "@playwright/test";

test.describe("Search behavior", () => {
  test("typing does not auto-search; button click and Enter trigger search; clear resets", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const input = page.getByTestId("search-input");
    const searchButton = page.getByTestId("search-button");
    await expect(input).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
    await expect(searchButton).toBeVisible();

    // Type text - URL should NOT update (no auto-search)
    await input.fill("");
    await input.type("castellers");
    
    // Verify URL doesn't update after typing (no debounced auto-search)
    await expect
      .poll(async () => page.url(), { timeout: 2000, intervals: [200] })
      .not.toContain("search=castellers");

    // Click search button to trigger search
    await searchButton.click();
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=castellers");

    // Test Enter key - type new term and press Enter
    await input.fill("sardanes");
    await input.press("Enter");
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=sardanes");

    // Clear search - type new text first so clear button is visible
    await input.fill("test");
    const clearButton = page.getByLabel("Clear search");
    await expect(clearButton).toBeVisible();
    // Click clear button - should reset immediately
    await clearButton.click();
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .not.toContain("search=");
    // Verify input is also cleared
    await expect(input).toHaveValue("");
  });
});
