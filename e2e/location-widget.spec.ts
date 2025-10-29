import { test, expect } from "@playwright/test";

test.describe("Location discovery widget", () => {
  test("dropdown opens, filters, selects and navigates", async ({ page }) => {
    test.setTimeout(45000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Use stable test ids and roles
    const toggle = page.getByTestId("location-toggle-button");
    await expect(toggle).toBeVisible({ timeout: 15000 });
    await toggle.click();
    const input = page.getByTestId("location-search-input");
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.fill("barc");
    // Ensure regions/options have loaded
    await page.waitForResponse((res) => res.url().includes("/api/regions/options"));
    const option = page.getByRole("option", { name: /barcelona/i }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    await expect.poll(async () => page.url(), { timeout: 20000 }).toContain("/barcelona");
  });
});
