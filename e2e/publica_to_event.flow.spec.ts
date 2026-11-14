import path from "node:path";
import { test, expect } from "@playwright/test";
import { MOCK_USER, mockAuthenticatedUser } from "./helpers/auth";

async function mockPublishFormOptions(page: import("@playwright/test").Page) {
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
}

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
    await mockPublishFormOptions(page);

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

    // Optional price: a paid amount typed the Catalan way.
    await page.getByLabel("De pagament").check();
    await page.fill("#price-amount", "12,50");

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

    // Wait for PublishForm's own redirect rather than forcing page.goto,
    // proving the post-publish ?promote=1 transition works end-to-end.
    await expect(page).toHaveURL(
      new RegExp(`/e/${resolvedSlug}\\?promote=1$`),
      { timeout: 60000 },
    );

    const upsellModal = page.getByTestId("promote-upsell-modal");
    await expect(upsellModal).toBeVisible({ timeout: 20000 });
    await page.getByTestId("promote-modal-keep-free").click();
    await expect(page.getByTestId("share-kit")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(upsellModal).toHaveCount(0);

    await expect(page).toHaveURL(new RegExp(`/e/${resolvedSlug}$`));
    // The Suspense fallback briefly renders an sr-only h1 too; match by name.
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(description, { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText(venue, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible();

    // The price shows in euros and reaches the JSON-LD offer as a number.
    const price = page.getByTestId("event-price").filter({ visible: true }).first();
    await expect(price).toHaveText(/^Preu: 12,50\s€$/);
    const offers = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => JSON.parse(script.textContent || "null"))
          .flat()
          .find((item) => item?.["@type"] === "Event")?.offers,
      );
    expect(offers).toEqual({ "@type": "Offer", price: 12.5, priceCurrency: "EUR" });

    // Reloading the event page does not reopen the one-time upsell modal.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByTestId("promote-upsell-modal")).toHaveCount(0);
  });

  test("recovers the post-publish upsell on a plain event URL even when auth hydration is slow", async ({
    page,
  }) => {
    let authDelayMs = 0;
    await page.route("**/api/auth/me", async (route) => {
      if (authDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, authDelayMs));
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: MOCK_USER }),
      });
    });
    await mockPublishFormOptions(page);

    const title = `E2E Recovery ${Date.now()}`;
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30000,
    });

    await page.fill("#title", title);
    await page.fill("#description", "Prova de recuperació del modal de promoció.");
    await page.getByTestId("next-button").click();

    await page.locator("#town-input").fill("Mataró");
    await page.keyboard.press("Enter");
    await page.fill("#location", "Plaça Gran");
    await page.getByTestId("next-button").click();

    await page.setInputFiles(
      'input[type="file"][accept*="image"]',
      path.join(process.cwd(), "public", "static", "icons", "icon-192x192.png"),
    );

    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeEnabled({ timeout: 20000 });
    await expect(form).toHaveAttribute("data-publish-armed", "true");

    const publishSlugHandle = page.waitForFunction(
      () =>
        document.body.dataset.lastE2eSlug ||
        (typeof window !== "undefined"
          ? window.__LAST_E2E_PUBLISH_SLUG__
          : null) ||
        null,
      { timeout: 60000 },
    );
    // Intercept the automatic ?promote=1 navigation on the same origin so
    // EventClient never mounts with ?promote=1 (and we stay on localhost, not
    // chrome-error://) while testing recovery on a plain /e/<slug> URL.
    const blockPromoteNav = (url: URL) => url.searchParams.get("promote") === "1";
    await page.route(blockPromoteNav, (route) => {
      if (route.request().isNavigationRequest()) {
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><html><body>Interrupted</body></html>",
        });
      }
      return route.abort();
    });
    await publishButton.click();
    const resolvedSlug = (await (await publishSlugHandle).jsonValue()) as string;
    await page.waitForFunction(
      (slug) =>
        Boolean(
          window.localStorage.getItem(`esdeveniments:post_publish_upsell:${slug}`),
        ),
      resolvedSlug,
      { timeout: 10000 },
    );
    await page.unroute(blockPromoteNav);

    // Simulate landing on the plain event URL (no ?promote=1) with slow auth hydration.
    authDelayMs = 400;
    await page.goto(`/e/${resolvedSlug}`, { waitUntil: "domcontentloaded" });

    const upsellModal = page.getByTestId("promote-upsell-modal");
    await expect(upsellModal).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("Escape");
    await expect(upsellModal).toHaveCount(0);

    // Once shown and dismissed, reloading must not reopen it.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(upsellModal).toHaveCount(0);
  });
});
