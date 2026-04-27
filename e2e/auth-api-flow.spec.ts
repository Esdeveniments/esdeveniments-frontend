import { test, expect, type Page } from "@playwright/test";

// With E2E_TEST_MODE=1 (set via playwright.config.ts), DevAuthProvider uses
// createApiAdapter() instead of the mock adapter. This means auth requests go
// through the full proxy chain: client adapter → fetch /api/auth/* → internal
// Next.js route → external wrapper → backend.
//
// We intercept at the Playwright network layer (page.route) to mock the
// internal API responses, testing the adapter + HTTP pipeline without needing
// a live backend.

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
          message:
            "User registered. Please verify your email before logging in.",
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

test.describe("Auth flow (real adapter + mocked routes)", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("login succeeds and shows user avatar", async ({ page }) => {
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

    await expect(
      page.getByTestId("login-form").getByRole("alert")
    ).toBeVisible({
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

    await expect(
      page.getByTestId("login-form").getByRole("alert")
    ).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("register succeeds and redirects", async ({ page }) => {
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

    await expect(
      page.getByTestId("register-form").getByRole("alert")
    ).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("register with weak password is blocked by validation", async ({
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
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill("short");
    await page
      .getByTestId("register-form")
      .getByRole("button", { name: /create account/i })
      .click();

    // Browser native validation (minLength=8) prevents form submission.
    // The input becomes invalid and the page stays on the register form.
    const isInvalid = await passwordInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);

    // Confirm we're still on the register page (form was not submitted)
    await expect(page.getByTestId("register-form")).toBeVisible();
  });

  test("login redirect param sends user to original page", async ({
    page,
  }) => {
    await mockAuthRoutes(page);

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

    // Avatar should disappear
    await expect(page.getByTestId("user-avatar-button")).not.toBeVisible({
      timeout: process.env.CI ? 15000 : 10000,
    });
  });

  test("API auth routes respond correctly", async ({ page }) => {
    // Smoke test without mocks: verify internal API routes exist
    // (actual responses depend on backend availability and HMAC config)

    const baseUrl =
      process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000";

    const loginResponse = await page.request.post("/api/auth/login", {
      data: { email: "a@b.com", password: "test" },
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
      },
    });

    // Should get a response (not 404), status depends on backend/proxy config
    expect([200, 400, 401, 403, 500]).toContain(loginResponse.status());

    const registerResponse = await page.request.post("/api/auth/register", {
      data: { email: "a@b.com", password: "test12345", name: "Test" },
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
      },
    });

    expect([200, 400, 401, 403, 409, 500]).toContain(
      registerResponse.status()
    );

    const meResponse = await page.request.get("/api/auth/me");
    // No token → 401 or 403 (proxy blocks without Origin)
    expect([401, 403]).toContain(meResponse.status());
  });
});
