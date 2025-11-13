import { test, expect } from "@playwright/test";

// Note: These flows are URL-driven; we assert URL structure and presence of basic UI.

test.describe("Filters canonical flows", () => {
  test("place only canonical: /barcelona", async ({ page }) => {
    await page.goto("/barcelona", { waitUntil: "domcontentloaded", timeout: 90000 });
    // If barcelona doesn't exist, it redirects to /catalunya (fallback behavior)
    // Accept either the original URL or the fallback
    await expect(page).toHaveURL(/\/(barcelona|catalunya)$/);
    // Wait for events list to be visible (may take time after redirect, especially on remote URLs)
    await expect(page.getByTestId("events-list")).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
  });

  test("place + date canonical: /barcelona/avui", async ({ page }) => {
    await page.goto("/barcelona/avui", { waitUntil: "domcontentloaded", timeout: 90000 });
    // If barcelona doesn't exist, it redirects to /catalunya/avui (preserves date)
    await expect(page).toHaveURL(/\/(barcelona|catalunya)\/avui$/);
    // Wait for events list to be visible (may take time after redirect, especially on remote URLs)
    await expect(page.getByTestId("events-list")).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
  });

  test("place + category canonical: /barcelona/teatre", async ({ page }) => {
    await page.goto("/barcelona/teatre", { waitUntil: "domcontentloaded", timeout: 90000 });
    // If barcelona doesn't exist, it redirects to /catalunya/teatre (preserves category)
    await expect(page).toHaveURL(/\/(barcelona|catalunya)\/teatre$/);
    // Wait for events list to be visible (may take time after redirect, especially on remote URLs)
    await expect(page.getByTestId("events-list")).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
  });
});
