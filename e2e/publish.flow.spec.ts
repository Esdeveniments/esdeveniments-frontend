import { test, expect } from "@playwright/test";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe("Publish event flow", () => {
  test("navigates to publica and sees the form", async ({ page }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Use testids rendered by the form
    await expect(page.getByTestId("event-form")).toBeVisible({
      timeout: 30000,
    });
    // First step shows the "next" button; publish appears on final step after required fields.
    await expect(page.getByTestId("next-button")).toBeVisible({
      timeout: 30000,
    });
  });
});
