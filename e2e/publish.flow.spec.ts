import { test, expect, type Page } from "@playwright/test";

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

const MOCK_USER = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  email: "test@example.com",
  name: "Test User",
  role: "USER" as const,
  emailVerified: true,
};

/** Set up route mocks for auth API endpoints to simulate logged-in user */
async function mockAuthenticatedUser(page: Page) {
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: MOCK_USER,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
  });

  await page.route("**/api/auth/me", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route("**/api/auth/refresh", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
  });
}

test.describe("Publish event flow", () => {
  test("navigates to publica and sees the form", async ({ page }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Use testids rendered by the form
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

  test("publish form is accessible to authenticated users", async ({ page }) => {
    await mockAuthenticatedUser(page);

    // Login first
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

    // Navigate to publish page
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
  });
});
