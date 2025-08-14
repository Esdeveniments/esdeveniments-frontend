import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("/qui-som renders and has basic content", async ({ page }) => {
    await page.goto("/qui-som", { waitUntil: "domcontentloaded" });
    // Basic presence: a heading with 'qui som' in Catalan
    const heading = page.getByRole("heading", { name: /qui som/i });
    await expect(heading.first()).toBeVisible();
    // Canonical link present
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
});
