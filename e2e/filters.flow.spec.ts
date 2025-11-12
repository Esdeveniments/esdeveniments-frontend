import { test, expect } from "@playwright/test";

// Note: These flows are URL-driven; we assert URL structure and presence of basic UI.

test.describe("Filters canonical flows", () => {
  test("place only canonical: /barcelona", async ({ page }) => {
    await page.goto("/barcelona", { waitUntil: "domcontentloaded" });
    // If barcelona doesn't exist, it redirects to /catalunya (fallback behavior)
    // Accept either the original URL or the fallback
    await expect(page).toHaveURL(/\/(barcelona|catalunya)$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });

  test("place + date canonical: /barcelona/avui", async ({ page }) => {
    await page.goto("/barcelona/avui", { waitUntil: "domcontentloaded" });
    // If barcelona doesn't exist, it redirects to /catalunya/avui (preserves date)
    await expect(page).toHaveURL(/\/(barcelona|catalunya)\/avui$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });

  test("place + category canonical: /barcelona/concerts", async ({ page }) => {
    await page.goto("/barcelona/concerts", { waitUntil: "domcontentloaded" });
    // If barcelona doesn't exist, it redirects to /catalunya/concerts (preserves category)
    await expect(page).toHaveURL(/\/(barcelona|catalunya)\/concerts$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });
});
