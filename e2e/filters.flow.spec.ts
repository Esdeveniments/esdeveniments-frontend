import { test, expect } from "@playwright/test";

// Note: These flows are URL-driven; we assert URL structure and presence of basic UI.

test.describe("Filters canonical flows", () => {
  test("place only canonical: /barcelona", async ({ page }) => {
    await page.goto("/barcelona", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/barcelona$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });

  test("place + date canonical: /barcelona/avui", async ({ page }) => {
    await page.goto("/barcelona/avui", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/barcelona\/avui$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });

  test("place + category canonical: /barcelona/concerts", async ({ page }) => {
    await page.goto("/barcelona/concerts", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/barcelona\/concerts$/);
    await expect(page.getByTestId("events-list")).toBeVisible();
  });
});
