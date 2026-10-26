import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe("Publish event flow", () => {
  test("guests can edit and optionally sign in without a create request", async ({ page }) => {
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
    await expect(page).toHaveURL(/\/api\/auth\/sign-in\?redirect=%2Fpublica%3Fresume%3D1/);
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
