import { test, expect } from "@playwright/test";

test.describe("Location discovery widget", () => {
  test("dropdown opens, filters, selects and navigates", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Use stable test ids and roles
    const toggle = page.getByTestId("location-toggle-button");
    await expect(toggle).toBeVisible({ timeout: 15000 });
    
    // Click to open dropdown
    await toggle.click();
    
    // Wait for input to appear
    const input = page.getByTestId("location-search-input");
    await expect(input).toBeVisible({ timeout: 15000 });
    
    // Wait for regions to be available (either already loaded or loading)
    // Check if options list is visible or loading indicator is present
    await page.waitForFunction(
      () => {
        const listbox = document.querySelector('[role="listbox"]');
        const loadingIndicator = document.querySelector('[data-testid="location-loading"]');
        return listbox !== null || loadingIndicator !== null;
      },
      { timeout: 10000 }
    );
    
    // Type search term
    await input.fill("barc");
    
    // Wait for filtered options to appear
    const option = page.getByRole("option", { name: /barcelona/i }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    
    // Wait for navigation
    await expect
      .poll(async () => page.url(), { timeout: 20000 })
      .toContain("/barcelona");
  });
});
