import { test, expect } from "@playwright/test";

test.describe("Offline and error pages", () => {
  test("offline page renders", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByTestId("offline-title")).toBeVisible();
    await expect(page.getByTestId("offline-home-link")).toBeVisible();
  });
});
