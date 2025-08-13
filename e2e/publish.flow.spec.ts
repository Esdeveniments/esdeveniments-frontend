import { test, expect } from "@playwright/test";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe("Publish event flow", () => {
  test("navigates to publica and sees the form", async ({ page }) => {
    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    // Use testids rendered by the form
    await expect(page.getByTestId("event-form")).toBeVisible();
    await expect(page.getByTestId("publish-button")).toBeVisible();
  });
});
