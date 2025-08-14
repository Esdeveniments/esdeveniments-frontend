import { test, expect } from "@playwright/test";

test.describe("Location discovery widget", () => {
  test("dropdown opens, filters, selects and navigates", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    // Open dropdown by finding the button adjacent to the heading
    const heading = page
      .getByRole("heading", { name: /Mirant esdeveniments a/i })
      .first();
    await heading.waitFor();
    const toggle = page
      .locator('h2:has-text("Mirant esdeveniments a") + div button')
      .first();
    await toggle.click();
    // Type a known place fragment
    const input = page.getByPlaceholder("Cercar ubicació...");
    await input.fill("barc");
    // Click first filtered option
    const option = page.getByRole("button", { name: /barcelona/i }).first();
    await option.click();
    await expect(page).toHaveURL(/\/barcelona$/);
  });
});
