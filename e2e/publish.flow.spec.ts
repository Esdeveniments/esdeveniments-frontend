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
    await mockAuthenticatedUser(page);

    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: 30000,
    });
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();
    await page.waitForURL("**/en", { timeout: 15000 });

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
