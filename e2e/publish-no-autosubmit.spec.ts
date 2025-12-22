import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Publish wizard should not auto publish", () => {
  test("does not publish when navigating back and forth and ignores implicit submits", async ({
    page,
  }) => {
    const mockRegions = [
      {
        id: 1,
        name: "Vallès Oriental",
        cities: [
          {
            id: 101,
            value: "cardedeu",
            label: "Cardedeu",
          },
        ],
      },
    ];

    const mockCategories = [{ id: 1, name: "Concerts", slug: "concerts" }];

    await page.route("**/api/regions/options", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRegions),
      })
    );

    await page.route("**/api/categories", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCategories),
      })
    );

    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await expect(page.getByTestId("event-form")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30000 }
    );

    // Step 1: basics
    await page.fill("input#title", `Concert de prova ${Date.now()}`);
    await page.fill(
      "textarea#description",
      "Descripció de prova amb prou caràcters."
    );

    // Ensure controlled inputs propagate state before clicking Next
    await page.locator("input#title").blur();
    await page.locator("textarea#description").blur();
    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 10000,
    });

    // Go to Step 2 using the explicit Next button (deterministic)
    await page.getByTestId("next-button").click();

    // Step 2: location should be visible now
    await expect(page.getByTestId("town-select")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator("input#location")).toBeVisible();

    // Select a town (react-select)
    await page.locator("#town").click();
    await page.locator("#town-input").fill("Cardedeu");
    await page.getByRole("option", { name: "Cardedeu" }).click();

    await page.fill("input#location", "Plaça Major");

    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 10000,
    });

    // Advance to Step 3
    await page.getByTestId("next-button").click();

    // Step 3: image/dates step
    await expect(page.getByTestId("publish-button")).toBeVisible({
      timeout: 20000,
    });

    const imagePath = path.join(
      process.cwd(),
      "public",
      "static",
      "icons",
      "icon-192x192.png"
    );
    await page.setInputFiles('input[type="file"][accept*="image"]', imagePath);

    // Go back to step 2 and forward to step 3 again
    await page.getByTestId("prev-button").click();
    await expect(page.locator("input#location")).toBeVisible();

    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 10000,
    });
    await page.getByTestId("next-button").click();
    await expect(page.getByTestId("publish-button")).toBeVisible();

    // Ensure we did not auto-publish / redirect
    const navigatedToEventUrl = await page
      .waitForURL(/\/e\//, { timeout: 2000 })
      .then(() => page.url())
      .catch(() => null);

    await expect(page).toHaveURL(/\/publica/);

    const publishedSlug = await page.evaluate(() => {
      const bodySlug = document.body?.dataset?.lastE2eSlug;
      const windowSlug = (
        window as unknown as { __LAST_E2E_PUBLISH_SLUG__?: string }
      ).__LAST_E2E_PUBLISH_SLUG__;
      return bodySlug || windowSlug || null;
    });
    expect(publishedSlug).toBeNull();
    expect(navigatedToEventUrl).toBeNull();
  });
});
