import { test, expect } from "@playwright/test";

test("home page renders and shows search input", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
  // Auto-waiting assertion - no need for manual waits
  await expect(page.getByTestId("search-input")).toBeVisible({ timeout: 30000 });
});
