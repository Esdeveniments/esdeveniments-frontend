import { test, expect } from "@playwright/test";
import { gotoFirstResolvableEvent } from "./helpers/events";

test.describe("Add to calendar menu", () => {
  test("opens menu and shows calendar links", async ({ page }) => {
    const slug = await gotoFirstResolvableEvent(page);
    test.skip(slug === null, "No resolvable event returned from API");

    // Auto-waiting assertion - no need for manual waits
    const button = page.getByRole("button", { name: /Afegir al calendari/i });
    await expect(button).toBeVisible({ timeout: 30000 });
    await button.click();

    await expect(
      page.getByRole("button", { name: "Google Calendar" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Outlook" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Altres" })).toBeVisible({ timeout: 10000 });
  });
});
