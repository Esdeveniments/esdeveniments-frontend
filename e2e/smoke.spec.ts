import { test, expect } from "@playwright/test";

test("home page renders and shows search input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("search-input")).toBeVisible();
});
