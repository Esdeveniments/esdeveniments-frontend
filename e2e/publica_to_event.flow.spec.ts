import path from "node:path";
import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

// Note: Service workers are blocked globally via playwright.config.ts (serviceWorkers: 'block')
// This allows Playwright's route handlers to intercept API requests for mocking

// Deterministic publish -> detail flow. With E2E_TEST_MODE the server action
// skips the backend and stores the event in memory under a stable slug, so no
// backend write happens. The deploy workflow's local e2e exports E2E_TEST_MODE=1
// for both the server and this process; PR runs against the Vercel preview skip
// it. The real-backend equivalent is publish-integration.spec.ts.
test.describe("Publica -> Event flow (deterministic)", () => {
  test.skip(
    process.env.E2E_TEST_MODE !== "1",
    "Needs a server built and started with E2E_TEST_MODE=1 / NEXT_PUBLIC_E2E_TEST_MODE=1 (CI sets both)",
  );

  test("publishes an event and displays the created detail page", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await page.route("**/api/regions/options", (route) =>
      route.fulfill({
        json: [
          {
            id: 1,
            name: "Maresme",
            slug: "maresme",
            cities: [
              {
                id: 2,
                value: "mataro",
                label: "Mataró",
                latitude: 41.54,
                longitude: 2.44,
              },
            ],
          },
        ],
      }),
    );

    await page.route("**/api/categories", (route) =>
      route.fulfill({
        json: [
          { id: 1, name: "Concerts", slug: "concerts" },
          { id: 2, name: "Festivals", slug: "festivals" },
        ],
      }),
    );

    const title = `E2E Concert ${Date.now()}`;
    const description = "Concert de prova automatitzada per a Playwright.";
    const venue = "Plaça Major";

    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30000,
    });

    // Step 1: basics
    await page.fill("#title", title);
    await expect(page.locator("#title")).toHaveValue(title);
    await page.fill("#description", description);
    await expect(page.locator("#description")).toHaveValue(description);
    await page.fill("#url", "https://example.com/prova-e2e");
    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 10000,
    });
    await page.getByTestId("next-button").click();

    // Step 2: location
    await page.locator("#town-input").fill("Mataró");
    await page.keyboard.press("Enter");
    await page.fill("#location", venue);
    await expect(page.locator("#location")).toHaveValue(venue);
    await expect(page.getByTestId("next-button")).toBeEnabled({
      timeout: 10000,
    });
    await page.getByTestId("next-button").click();

    // Step 3: image and dates (the picker's default start is enough here)
    await page.setInputFiles(
      'input[type="file"][accept*="image"]',
      path.join(process.cwd(), "public", "static", "icons", "icon-192x192.png"),
    );

    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeEnabled({ timeout: 20000 });
    await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");

    const publishSlugHandle = page.waitForFunction(
      () =>
        document.body.dataset.lastE2eSlug ||
        (typeof window !== "undefined"
          ? window.__LAST_E2E_PUBLISH_SLUG__
          : null) ||
        null,
      { timeout: 60000 },
    );
    await publishButton.click();
    const resolvedSlug = (await (await publishSlugHandle).jsonValue()) as string;

    await page.goto(`/e/${resolvedSlug}`, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/e\/e2e-event-/);
    // The Suspense fallback briefly renders an sr-only h1 too; match by name.
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(description, { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText(venue, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible();
  });
});
