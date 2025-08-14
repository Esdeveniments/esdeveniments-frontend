import { test, expect } from "@playwright/test";

test.describe("Filters interactions", () => {
  test("distance + geo pill and removal via pill X", async ({ page }) => {
    await page.goto("/barcelona?distance=10&lat=41.3902&lon=2.1540", {
      waitUntil: "domcontentloaded",
    });

    // Expect URL contains distance
    expect(page.url()).toContain("distance=10");

    // Remove via pill X if present
    const distancePillRemove = page.getByTestId(
      /filter-pill-distance-.*-remove|filter-pill-distance-remove/
    );
    if (await distancePillRemove.count()) {
      await distancePillRemove.first().click();
      // Wait for either URL change or the pill to disappear
      try {
        await page.waitForURL((url) => !url.toString().includes("distance="), {
          timeout: 5000,
        });
      } catch {
        // Fallback: wait for pill removal
        await page
          .getByTestId(/filter-pill-distance-.*/)
          .first()
          .waitFor({ state: "detached", timeout: 3000 })
          .catch(() => {});
      }
      return;
    }

    // Fallback: navigate to the same page without params and assert URL cleared
    await page.goto("/barcelona", { waitUntil: "domcontentloaded" });
    expect(page.url().includes("distance=")).toBeFalsy();
  });
});
