import { test, expect } from "@playwright/test";
import path from "path";

// This test relies on E2E_TEST_MODE to short-circuit the server action and produce a stable slug.
// CI sets no E2E_TEST_MODE by default. We set it via Playwright config env or GitHub Actions step if needed.

test.describe("Publica -> Event flow (deterministic)", () => {
  test("publishes an event and displays the created detail page", async ({
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

    const mockCategories = [
      { id: 1, name: "Concerts", slug: "concerts" },
      { id: 2, name: "Festivals", slug: "festivals" },
    ];

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

    const title = `E2E Concert ${Date.now()}`;
    const description = "Concert de prova automatitzada per a Playwright.";
    const venue = "Plaça Major";

    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await expect(page.getByTestId("event-form")).toBeVisible({
      timeout: 30000,
    });

    const imagePath = path.join(
      process.cwd(),
      "public",
      "static",
      "icons",
      "icon-192x192.png"
    );
    await page.setInputFiles('input[type="file"][accept*="image"]', imagePath);

    await page.fill("#title", title);
    await expect(page.locator("#title")).toHaveValue(title);
    await page.fill("#description", description);
    await expect(page.locator("#description")).toHaveValue(description);
    await page.fill("#location", venue);
    await expect(page.locator("#location")).toHaveValue(venue);
    await page.fill("#url", "https://example.com/prova-e2e");

    const selectOption = async (inputId: string, option: string) => {
      const container = page.locator(`#${inputId}`);
      await container.click();
      await container.locator("input").fill(option);
      await page.getByRole("option", { name: option }).click();
    };

    await selectOption("region", "Vallès Oriental");
    await selectOption("town", "Cardedeu");

    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeEnabled();

    const publishSlugHandle = page.waitForFunction(
      () => window.__LAST_E2E_PUBLISH_SLUG__ || null,
      { timeout: 60000 }
    );
    await publishButton.click();
    const slug = await publishSlugHandle;
    const resolvedSlug = (await slug.jsonValue()) as string;

    await page
      .waitForURL(new RegExp(`/e/${resolvedSlug}`), {
        timeout: 15000,
        waitUntil: "commit",
      })
      .catch(async () => {
        await page.goto(`/e/${resolvedSlug}`);
      });

    await expect(page).toHaveURL(/\/e\/e2e-event-/);
    await expect(page.locator("h1")).toHaveText(title);
    await expect(page.getByText(description, { exact: false })).toBeVisible();
    await expect(
      page.getByText(`${venue}, Cardedeu, Vallès Oriental`, { exact: false })
    ).toBeVisible();
  });
});
