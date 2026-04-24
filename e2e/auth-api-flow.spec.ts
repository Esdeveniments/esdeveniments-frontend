import { test, expect } from "@playwright/test";

// In development mode, the app uses createMockAdapter (in-memory user store)
// instead of the real API adapter. This means auth requests are handled
// entirely in-browser by the mock adapter — no HTTP requests to /api/auth/*.
//
// Preloaded mock user: dev@test.com / dev (configured in DevAuthProvider.tsx)
//
// The API proxy chain (adapter → internal routes → external wrapper → backend)
// is thoroughly tested by unit tests in test/auth-external.test.ts and
// test/auth-api-adapter.test.ts.

const MOCK_EMAIL = "dev@test.com";
const MOCK_PASSWORD = "dev";

test.describe("Auth flow", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("login with valid credentials succeeds and shows avatar", async ({
    page,
  }) => {
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill(MOCK_EMAIL);
    await page.getByLabel(/password/i).fill(MOCK_PASSWORD);
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

  test("register new account succeeds and redirects", async ({ page }) => {
    await page.goto("/en/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByLabel(/name/i).fill("E2E User");
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
    await page.goto("/en/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Use the preloaded mock user email → "email-taken" error
    await page.getByLabel(/email/i).fill(MOCK_EMAIL);
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
    // Go to login with redirect to /preferits
    await page.goto("/en/iniciar-sessio?redirect=%2Fen%2Fpreferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill(MOCK_EMAIL);
    await page.getByLabel(/password/i).fill(MOCK_PASSWORD);
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
    // Login first
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill(MOCK_EMAIL);
    await page.getByLabel(/password/i).fill(MOCK_PASSWORD);
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

  test("API auth routes respond correctly", async ({ page }) => {
    // Smoke test: verify internal API routes exist and respond
    // (actual responses depend on backend availability and HMAC config)

    const loginResponse = await page.request.post("/api/auth/login", {
      data: { email: "a@b.com", password: "test" },
      headers: {
        "Content-Type": "application/json",
        Origin: page.url() || "http://localhost:3001",
      },
    });

    // Should get a response (not 404), status depends on backend/proxy config
    expect([200, 400, 401, 403, 500]).toContain(loginResponse.status());

    const registerResponse = await page.request.post("/api/auth/register", {
      data: { email: "a@b.com", password: "test12345", name: "Test" },
      headers: {
        "Content-Type": "application/json",
        Origin: page.url() || "http://localhost:3001",
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
