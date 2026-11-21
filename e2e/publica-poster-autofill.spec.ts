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

    // Jump to Step 2 via field pill & check town + venue
    await page
      .getByTestId("poster-autofill-success")
      .getByRole("button", { name: "Municipi" })
      .click();
    await expect(page.locator("#location")).toHaveValue("Teatre Monumental");
    await expect(page.getByTestId("town-select")).toContainText("Mataró");

    // Jump to Step 3 via field pill & check poster attached + paid price
    await page
      .getByTestId("poster-autofill-success")
      .getByRole("button", { name: "Preu" })
      .click();
    await expect(page.locator("#price-amount")).toHaveValue("8.5");
    await expect(page.getByRole("img").first()).toBeVisible();

    // Return to Step 1, edit title manually, then click Surgical Undo
    await page
      .getByTestId("poster-autofill-success")
      .getByRole("button", { name: "Títol" })
      .click();
    await page.fill("#title", "Títol personalitzat");
    await page.getByTestId("poster-autofill-undo").click();

    // Manual edit survives Undo; untouched AI description reverts
    await expect(page.locator("#title")).toHaveValue("Títol personalitzat");
    await expect(page.locator("#description")).toHaveValue("");
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
