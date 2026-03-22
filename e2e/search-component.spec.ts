import { test, expect } from "@playwright/test";

test.describe("Search behavior", () => {
  test("typing does not auto-search; button click and Enter trigger search; clear resets", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const input = page.getByTestId("search-input");
    const searchButton = page.getByTestId("search-button");
    await expect(input).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(searchButton).toBeVisible();

    // Type text - URL should NOT update (no auto-search)
    await input.fill("");
    await input.type("castellers");

    // Verify URL doesn't update after typing (no debounced auto-search)
    // Wait briefly to ensure no auto-search triggers, then check once
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/search=castellers/);

    // Click search button to trigger search
    await searchButton.click();
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=castellers");

    // After navigation to a place page, cacheComponents keeps the old HeroSearch
    // in the DOM (hidden). Scope subsequent interactions to the visible search-bar
    // wrapper from the ClientInteractiveLayer's Search component.
    const searchBar = page.getByTestId("search-bar");
    const placeInput = searchBar.getByTestId("search-input");
    const placeSearchButton = searchBar.getByTestId("search-button");
    await expect(placeInput).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Test Enter key - type new term and press Enter
    await placeInput.fill("sardanes");
    await placeInput.press("Enter");
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("search=sardanes");

    // Clear search - type new text first so clear button is visible
    await placeInput.fill("test");
    const clearButton = searchBar.getByTestId("clear-search-button");
    await expect(clearButton).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
    // Click clear button - should reset input immediately (but not URL until submit)
    await clearButton.click();
    await expect(placeInput).toHaveValue("");

    // Submit to verify URL clears
    await placeSearchButton.click();
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .not.toContain("search=");
  });
});
