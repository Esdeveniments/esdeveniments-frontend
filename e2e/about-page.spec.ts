import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("/qui-som renders and has basic content", async ({ page }) => {
    await page.goto("/qui-som", { waitUntil: "domcontentloaded" });
    // Basic presence: a heading with 'qui som' in Catalan
    const heading = page.getByRole("heading", { name: /qui som/i });
    await expect(heading.first()).toBeVisible();
    // Canonical link present (use .first() — Next.js 16 streaming may render duplicate head tags)
    await expect(page.locator('link[rel="canonical"]').first()).toBeAttached();
  });
});
