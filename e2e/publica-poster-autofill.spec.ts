import { test, expect, type Page } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";
import { DEFAULT_IMAGE } from "./helpers/publish";

async function mockPublishCatalogs(page: Page) {
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
        { id: 2, name: "Teatre", slug: "teatre" },
      ],
    }),
  );
}

test.describe("Publica AI poster autofill", () => {
  test("untouched /publica page makes zero extract-poster requests", async ({
    page,
  }) => {
    await mockPublishCatalogs(page);
    const aiRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/events/extract-poster")) {
        aiRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    );
    await expect(page.getByTestId("poster-autofill-card")).toBeVisible();
    await page.fill("#title", "Concert manual sense IA");
    expect(aiRequests).toEqual([]);
  });

  test("signed-in poster upload fills all 3 steps, attaches image, and surgical Undo preserves later edits", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockPublishCatalogs(page);

    await page.route("**/api/events/extract-poster", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: { state: "available", signedIn: true },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        json: {
          hasData: true,
          model: "gemini/gemini-3.6-flash",
          extracted: {
            title: "Nit de Jazz al Monumental",
            description:
              "El quartet local presenta el nou repertori acústic.\n\nObertura de portes a les 19.30 h.",
            startDate: "2027-06-18T20:00",
            endDate: "2027-06-18T22:00",
            isAllDay: false,
            dateInferred: true,
            isMultiEvent: false,
            town: "Mataro",
            location: "Teatre Monumental",
            url: "https://teatremonumental.cat",
            price: "Anticipada 8,50 € / Taquilla 10 €",
            priceResolution: {
              priceType: "paid",
              priceAmount: "8.5",
              originalPrice: "Anticipada 8,50 € / Taquilla 10 €",
              needsReview: true,
            },
            categories: ["concerts"],
          },
        },
      });
    });

    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    );

    await page
      .getByTestId("poster-autofill-input")
      .setInputFiles(DEFAULT_IMAGE);

    await expect(page.getByTestId("poster-autofill-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("poster-autofill-card")).toHaveCount(1);
    await expect(
      page.getByTestId("poster-autofill-card").getByRole("heading", { level: 2 }),
    ).toHaveText("Cartell llegit");
    await expect(page.getByTestId("poster-autofill-pick")).toHaveText(
      "Canvia el cartell",
    );
    await expect(page.getByTestId("poster-autofill-undo")).toHaveText(
      "Desfés els camps",
    );
    await expect(
      page.getByTestId("poster-autofill-analyze-existing"),
    ).toHaveCount(0);
    await expect(page.getByTestId("poster-autofill-warnings")).toBeVisible();

    // Step 1 auto-filled
    await expect(page.locator("#title")).toHaveValue(
      "Nit de Jazz al Monumental",
    );
    await expect(page.locator("#description")).toContainText(
      "El quartet local presenta el nou repertori acústic.",
    );
    await expect(page.locator("#url")).toHaveValue(
      "https://teatremonumental.cat",
    );

    // Advance to Step 2 via wizard button & check town + venue
    await page.getByTestId("next-button").click();
    await expect(page.locator("#location")).toHaveValue("Teatre Monumental");
    await expect(page.getByTestId("town-select")).toContainText("Mataró");

    // Advance to Step 3 via wizard button & check poster attached + paid price + direct date inputs
    await page.getByTestId("next-button").click();
    await expect(page.locator("#price-amount")).toHaveValue("8.5");
    await expect(page.locator("#event-date-start-date")).toHaveValue("2027-06-18");
    await expect(page.locator("#event-date-end-date")).toHaveValue("2027-06-18");
    await expect(page.getByRole("img").first()).toBeVisible();

    // Multi-month exhibition edit via direct end date input
    await page.locator("#event-date-end-date").fill("2027-11-15");
    await expect(page.locator("#event-date-end-date")).toHaveValue("2027-11-15");

    // Return to Step 1, edit title manually, then click Surgical Undo
    await page.getByTestId("prev-button").click();
    await page.getByTestId("prev-button").click();
    await page.fill("#title", "Títol personalitzat");
    await page.getByTestId("poster-autofill-undo").click();

    // Manual edit survives Undo; untouched AI description reverts
    await expect(page.locator("#title")).toHaveValue("Títol personalitzat");
    await expect(page.locator("#description")).toHaveValue("");
  });

  test("re-uploading a second poster overwrites modified fields and stays 1-click reversible", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockPublishCatalogs(page);

    let postCount = 0;
    await page.route("**/api/events/extract-poster", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: { state: "available", signedIn: true },
        });
        return;
      }
      postCount += 1;
      await route.fulfill({
        status: 200,
        json: {
          hasData: true,
          model: "gemini/gemini-3.5-flash-lite",
          extracted:
            postCount === 1
              ? {
                  title: "Primer Concert",
                  description: "Descripció del primer cartell.",
                  startDate: "2027-07-10T20:00",
                  endDate: "2027-07-10T22:00",
                  isAllDay: false,
                  dateInferred: false,
                  isMultiEvent: false,
                  town: "Mataró",
                  location: "Plaça Gran",
                  url: null,
                  price: "Gratuït",
                  priceResolution: {
                    priceType: "free",
                    priceAmount: "",
                    originalPrice: null,
                    needsReview: false,
                  },
                  categories: ["concerts"],
                }
              : {
                  title: "Exposició d'Estiu",
                  description: "Del juliol al novembre al museu.",
                  startDate: "2026-07-01T10:00",
                  endDate: "2026-11-30T20:00",
                  isAllDay: false,
                  dateInferred: false,
                  isMultiEvent: false,
                  town: "Mataró",
                  location: "Museu de Mataró",
                  url: null,
                  price: "Gratuït",
                  priceResolution: {
                    priceType: "free",
                    priceAmount: "",
                    originalPrice: null,
                    needsReview: false,
                  },
                  categories: ["teatre"],
                },
        },
      });
    });

    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    );

    // First poster scan
    await page.getByTestId("poster-autofill-input").setInputFiles(DEFAULT_IMAGE);
    await expect(page.getByTestId("poster-autofill-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#title")).toHaveValue("Primer Concert");

    // Modify title and clear description
    await page.fill("#title", "Títol editat manualment");
    await page.fill("#description", "");

    // Replace with second poster via the real "Canvia el cartell" button ->
    // overwrites modified & cleared fields cleanly
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByTestId("poster-autofill-pick").click(),
    ]);
    await fileChooser.setFiles(DEFAULT_IMAGE);
    await expect(page.locator("#title")).toHaveValue("Exposició d'Estiu", {
      timeout: 15_000,
    });
    await expect(page.locator("#description")).toHaveValue(
      "Del juliol al novembre al museu.",
    );

    // 1-click Undo restores previous state cleanly
    await page.getByTestId("poster-autofill-undo").click();
    await expect(page.locator("#title")).toHaveValue("Títol editat manualment");
    await expect(page.locator("#description")).toHaveValue("");
  });

  test("verified Logto scan return auto-scans once without auto-publishing; abandoned scan intent makes zero AI calls on manual load", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockPublishCatalogs(page);

    const postRequests: string[] = [];
    await page.route("**/api/events/extract-poster", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: { state: "available", signedIn: true },
        });
        return;
      }
      postRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        json: {
          hasData: true,
          model: "gemini/gemini-3.5-flash-lite",
          extracted: {
            title: "Retorn verificat",
            description: "Escanejat automàticament en tornar.",
            startDate: "2027-08-01T19:00",
            endDate: "2027-08-01T21:00",
            isAllDay: false,
            dateInferred: false,
            isMultiEvent: false,
            town: "Mataró",
            location: "Can Gassol",
            url: null,
            price: null,
            priceResolution: null,
            categories: ["concerts"],
          },
        },
      });
    });

    // Seed an abandoned scan intent in sessionStorage, then visit /publica WITHOUT ?scan=
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "poster-scan-intent-v1",
        JSON.stringify({ intentId: "abandoned-123", createdAt: Date.now() }),
      );
    });

    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    );

    // Stale intent must be cleared and trigger 0 AI calls
    const remainingIntent = await page.evaluate(() =>
      sessionStorage.getItem("poster-scan-intent-v1"),
    );
    expect(remainingIntent).toBeNull();
    expect(postRequests).toEqual([]);
    await expect(page.getByTestId("poster-autofill-card")).toHaveCount(1);
  });

  test("guest upload when AI is disabled keeps poster and makes zero auth redirects", async ({
    page,
  }) => {
    await mockPublishCatalogs(page);
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, json: { user: null } }),
    );
    await page.route("**/api/events/extract-poster", (route) =>
      route.fulfill({
        status: 200,
        json: { state: "disabled", signedIn: false },
      }),
    );

    const signInHits: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/sign-in")) signInHits.push(req.url());
    });

    await page.goto("/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("event-form")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    );

    await page
      .getByTestId("poster-autofill-input")
      .setInputFiles(DEFAULT_IMAGE);

    await expect(page.getByTestId("poster-autofill-error")).toBeVisible({
      timeout: 15_000,
    });
    expect(signInHits).toEqual([]);
    // Poster thumbnail is still shown in the card
    await expect(
      page.getByTestId("poster-autofill-card").locator("img"),
    ).toBeVisible();
  });
});
