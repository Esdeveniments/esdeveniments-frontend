import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe("Publish event flow", () => {
  test("guests see the auth gate, not the form", async ({ page }) => {
    // No auth mock → unauthenticated. Publishing is gated upfront.
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await expect(page.getByTestId("publish-auth-gate")).toBeVisible({
      timeout: 30000,
    });
    // The form (and its data hooks) must not mount for guests.
    await expect(page.getByTestId("event-form")).toHaveCount(0);
    // CTA carries the redirect back to /publica.
    await expect(
      page.getByTestId("publish-auth-gate").getByRole("link").first()
    ).toHaveAttribute("href", /\/iniciar-sessio\?redirect=%2Fpublica/);
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
