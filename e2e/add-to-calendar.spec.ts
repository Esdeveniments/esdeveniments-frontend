import { test, expect } from "@playwright/test";

test.describe("Add to calendar menu", () => {
  test("opens menu and shows calendar links", async ({ page }) => {
    // Find an event page first via sitemap
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    const region = page.getByTestId("sitemap-region-link").first();
    if (await region.isVisible()) await region.click();
    const city = page.getByTestId("sitemap-city-link").first();
    if (await city.isVisible()) await city.click();
    const eventLink = page.locator('a[href^="/e/"]').first();
    if (!(await eventLink.isVisible())) test.skip(true, "No event links");
    await eventLink.click();

    // Open the add to calendar list
    const button = page.getByRole("button", { name: /Afegir al calendari/i });
    await button.click();

    // Calendar options should appear
    await expect(
      page.getByRole("button", { name: "Google Calendar" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Outlook" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Altres" })).toBeVisible();
  });
});
