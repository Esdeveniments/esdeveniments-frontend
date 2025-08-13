import { test, expect } from "@playwright/test";

test.describe("Search behavior", () => {
  test("debounced typing updates URL; Enter submits immediately; clear resets", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const input = page.getByTestId("search-input");
    await expect(input).toBeVisible();

    // On home, search navigates to /catalunya/; start by ensuring we are on that path after focusing the input
    await input.fill("");
    await input.type("castellers");
    // Small wait less than debounce threshold to ensure no early update
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain("search=castellers");

    // Wait beyond debounce threshold and for navigation
    await page.waitForTimeout(1600);
    await page.waitForURL(/\/catalunya\/?\?search=castellers/, {
      timeout: 8000,
    });

    // Press Enter for immediate submit on same path
    await input.fill("sardanes");
    await input.press("Enter");
    await page.waitForURL(/search=sardanes/, { timeout: 8000 });

    // Clear search via UI clear control if present, otherwise programmatically
    // We rely on value reset to propagate URL clearing
    await input.fill("");
    // Debounce to clear param and wait for URL reset
    await page.waitForTimeout(1600);
    await page.waitForURL(/\/catalunya\/?(?!.*search=)/, { timeout: 8000 });
  });
});
