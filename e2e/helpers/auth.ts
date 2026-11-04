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
 * Route-mock the session endpoint so the app treats the user as logged in.
 * AuthProvider hydrates from GET /api/auth/me on mount, so mocking /me with the
 * Logto-shaped `{ user }` payload is enough to satisfy auth gates without
 * driving the OIDC redirect. Call before navigating to a gated page.
 */
export async function mockAuthenticatedUser(page: Page): Promise<void> {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: MOCK_USER }),
    })
  );
}
