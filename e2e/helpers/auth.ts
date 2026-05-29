import type { Page } from "@playwright/test";

/** Authenticated user fixture. Mirrors AuthenticatedUserDTO (id is a uuid,
 *  and `username` is required by the client-side guard). */
export const MOCK_USER = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  email: "test@example.com",
  name: "Test User",
  username: "test-user",
  role: "USER" as const,
  emailVerified: true,
};

/**
 * Route-mock the auth endpoints so the app treats the session as logged in.
 * AuthProvider calls getSession() → GET /api/auth/me on mount, so mocking
 * /me alone is enough to satisfy auth gates without driving the login form.
 * Call before navigating to a gated page.
 */
export async function mockAuthenticatedUser(page: Page): Promise<void> {
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

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    })
  );

  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    })
  );
}
