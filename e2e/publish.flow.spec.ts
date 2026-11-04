import { test, expect } from "@playwright/test";
import { MOCK_USER, mockAuthenticatedUser } from "./helpers/auth";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe("Publish event flow", () => {
  test("keeps pre-auth edits across SPA navigation until the owner resolves", async ({ page }) => {
    let resolveAuth!: () => void;
    const ready = new Promise<void>((resolve) => { resolveAuth = resolve; });
    await page.route("**/api/auth/me", async (route) => {
      await ready;
      return route.fulfill({ json: { user: MOCK_USER } });
    });
    await page.route("**/api/regions/options", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/categories", (route) => route.fulfill({ json: [] }));
    await page.goto("/publica");
    await expect(page.locator("input#title")).toBeEnabled();
    await page.locator("input#title").fill("Edits before the session resolves");
    await page.locator('nav a[href="/"]').first().click();
    await expect(page).not.toHaveURL(/\/publica$/);
    resolveAuth();
    await page.locator('nav a[href="/publica"]').first().click();
    await expect(page.locator("input#title")).toHaveValue("Edits before the session resolves");
    await expect(page.getByTestId("draft-save-status")).toHaveText("Desat en aquest dispositiu");
  });

  test("guests can edit and optionally sign in without a create request", async ({ page }) => {
    let creates = 0;
    await page.route("**/publica", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      creates++;
      return route.fulfill({ status: 500, body: "Unexpected guest create" });
    });
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, json: { user: null } }));
    await page.route("**/api/regions/options", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/categories", (route) => route.fulfill({ json: [] }));
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await expect(page.getByTestId("event-form")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("input#title")).toBeEnabled();
    await page.locator("input#title").fill("Esborrany incomplet");
    await page.route("**/api/auth/sign-in?*", (route) =>
      route.fulfill({ contentType: "text/html", body: "<main>Sign-in fixture</main>" }));
    await page.getByTestId("publish-early-sign-in").click();
    await expect(page).toHaveURL((url) => url.pathname === "/api/auth/sign-in" &&
      url.searchParams.get("redirect") === "/publica?resume=1" && url.searchParams.get("locale") === "ca");
    expect(creates).toBe(0);
  });

  test("authenticated users see the form", async ({ page }) => {
    // Logto hosts sign-in; the session is established via the /api/auth/me mock,
    // so navigate straight to the gated page rather than driving a login form.
    await mockAuthenticatedUser(page);

    await page.goto("/en/publica", {
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
    await expect(page.getByTestId("next-button")).toBeVisible({
      timeout: 30000,
    });
  });
});
