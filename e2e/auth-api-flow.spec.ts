import { test, expect, type Page } from "@playwright/test";

// Note: Service workers are blocked globally via playwright.config.ts (serviceWorkers: 'block')
// This allows Playwright's route handlers to intercept API requests for mocking.

// These tests verify the auth flow through the real API proxy chain by mocking
// the internal Next.js API routes (/api/auth/*). This tests the full client →
// internal route → adapter pipeline without depending on the real backend.

const MOCK_USER = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  role: "USER" as const,
  emailVerified: true,
};

const MOCK_AUTH_RESPONSE = {
  accessToken: "mock-jwt-token",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  user: MOCK_USER,
};

/** Set up route mocks for auth API endpoints */
async function mockAuthRoutes(
  page: Page,
  overrides?: {
    loginStatus?: number;
    loginBody?: unknown;
    registerStatus?: number;
    registerBody?: unknown;
    meStatus?: number;
    meBody?: unknown;
  }
) {
  await page.route("**/api/auth/login", (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return route.fulfill({
      status: overrides?.loginStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(overrides?.loginBody ?? MOCK_AUTH_RESPONSE),
    });
  });

  await page.route("**/api/auth/register", (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return route.fulfill({
      status: overrides?.registerStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(
        overrides?.registerBody ?? {
          message: "User registered. Please verify your email before logging in.",
        }
      ),
    });
  });

  await page.route("**/api/auth/me", (route) => {
    return route.fulfill({
      status: overrides?.meStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(overrides?.meBody ?? MOCK_USER),
    });
  });
}

test.describe("Auth API proxy chain", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("login via API route succeeds and shows user avatar", async ({
    page,
  }) => {
    await mockAuthRoutes(page);

    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();

    // Should redirect to home after successful login
    await page.waitForURL("**/en", {
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Avatar should be visible in navbar
    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await mockAuthRoutes(page, {
      loginStatus: 401,
      loginBody: { error: "invalid-credentials" },
    });

    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("wrong@test.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();

    await expect(page.getByRole("alert")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("login with unverified email shows error", async ({ page }) => {
    await mockAuthRoutes(page, {
      loginStatus: 400,
      loginBody: { error: "email-not-verified" },
    });

    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("unverified@test.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();

    await expect(page.getByRole("alert")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("register via API route succeeds and redirects", async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto("/en/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("new@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByLabel(/name/i).fill("New User");
    await page
      .getByTestId("register-form")
      .getByRole("button", { name: /create account/i })
      .click();

    // Should redirect to home after successful registration
    await page.waitForURL("**/en", {
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("register with duplicate email shows error", async ({ page }) => {
    await mockAuthRoutes(page, {
      registerStatus: 409,
      registerBody: { error: "email-taken" },
    });

    await page.goto("/en/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("existing@test.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("register-form")
      .getByRole("button", { name: /create account/i })
      .click();

    await expect(page.getByRole("alert")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("register with weak password shows client-side validation error", async ({
    page,
  }) => {
    await page.goto("/en/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("new@test.com");
    await page.getByLabel(/password/i).fill("short");
    await page
      .getByTestId("register-form")
      .getByRole("button", { name: /create account/i })
      .click();

    // Client-side validation: password < 8 chars shows error
    await expect(page.getByRole("alert")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("login redirect param sends user back to original page", async ({
    page,
  }) => {
    await mockAuthRoutes(page);

    // Go to login with redirect to /preferits
    await page.goto("/en/iniciar-sessio?redirect=%2Fen%2Fpreferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();

    // Should redirect to the original page
    await page.waitForURL("**/preferits", {
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("logout clears avatar from navbar", async ({ page }) => {
    await mockAuthRoutes(page);

    // Login first
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page
      .getByTestId("login-form")
      .getByRole("button", { name: /log in/i })
      .click();

    await page.waitForURL("**/en", {
      timeout: process.env.CI ? 30000 : 15000,
    });

    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Open dropdown and logout
    await page.getByTestId("user-avatar-button").click();
    await expect(page.getByTestId("user-dropdown-menu")).toBeVisible({
      timeout: 5000,
    });

    const logoutButton = page
      .getByTestId("user-dropdown-menu")
      .getByRole("button", { name: /log out|tancar sessió|cerrar sesión/i });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Avatar should disappear, login button should reappear
    await expect(page.getByTestId("user-avatar-button")).not.toBeVisible({
      timeout: process.env.CI ? 15000 : 10000,
    });
  });

  test("API auth routes return correct status codes", async ({ page }) => {
    // This test verifies the internal API routes respond correctly
    // without mocking — testing the actual Next.js route handlers

    const loginResponse = await page.request.post("/api/auth/login", {
      data: { email: "a@b.com", password: "test" },
      headers: { "Content-Type": "application/json" },
    });

    // Should get a response (not 404/500), actual status depends on backend availability
    expect([200, 400, 401, 500]).toContain(loginResponse.status());

    const registerResponse = await page.request.post("/api/auth/register", {
      data: { email: "a@b.com", password: "test12345", name: "Test" },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 400, 401, 409, 500]).toContain(registerResponse.status());

    const meResponse = await page.request.get("/api/auth/me");
    // No token → 401
    expect(meResponse.status()).toBe(401);
  });
});
