import { test, expect } from "@playwright/test";

test.describe("Auth → Profile flow", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("login page renders with form and noindex", async ({ page }) => {
    await page.goto("/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
  });

  test("register page renders with form and noindex", async ({ page }) => {
    await page.goto("/registre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
  });

  test("login form shows error on invalid credentials (dev mock)", async ({
    page,
  }) => {
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("wrong@test.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByTestId("login-form").getByRole("button", { name: /log in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("full flow: login → navbar avatar → my profile → profile page", async ({
    page,
  }) => {
    // Step 1: Navigate to login page
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Step 2: Login with mock credentials
    await page.getByLabel(/email/i).fill("dev@test.com");
    await page.getByLabel(/password/i).fill("dev");
    await page.getByTestId("login-form").getByRole("button", { name: /log in/i }).click();

    // Step 3: Should redirect to home and show avatar
    await page.waitForURL("**/en", { timeout: process.env.CI ? 30000 : 15000 });

    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Step 4: Click avatar to open dropdown
    await page.getByTestId("user-avatar-button").click();

    await expect(page.getByTestId("user-dropdown-menu")).toBeVisible({
      timeout: 5000,
    });

    // Step 5: Dropdown shows user name and "My profile" link
    await expect(
      page.getByTestId("user-dropdown-menu").getByText("Razzmatazz")
    ).toBeVisible();

    const profileLink = page
      .getByTestId("user-dropdown-menu")
      .getByRole("link", { name: /profile|perfil/i });
    await expect(profileLink).toBeVisible();

    // Step 6: Click "My profile" → navigate to profile page
    await profileLink.click();

    await page.waitForURL("**/perfil/razzmatazz", {
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Step 7: Profile page shows header with name and verified badge
    await expect(page.getByTestId("profile-header")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(
      page.getByTestId("profile-header").getByText("Razzmatazz")
    ).toBeVisible();

    await expect(
      page.getByTestId("profile-header").getByText(/verified|verificat/i)
    ).toBeVisible();
  });

  test("profile page shows not-found for nonexistent profile", async ({
    page,
  }) => {
    await page.goto("/en/perfil/nonexistent-slug", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    // notFound() triggers Next.js error boundary which may render the custom
    // not-found.tsx or the generic 404. Either way, "not found" text appears.
    await expect(
      page.getByText(/not found|no trobat|page not found|profile not found/i).first()
    ).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
  });

  test("login and register pages cross-link correctly", async ({ page }) => {
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Login page has "Create one" link to register
    const registerLink = page.getByRole("link", { name: /create one/i });
    await expect(registerLink).toBeVisible({ timeout: 15000 });
    await registerLink.click();

    await page.waitForURL("**/registre", {
      timeout: process.env.CI ? 30000 : 15000,
    });

    await expect(page.getByTestId("register-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Register page has "Log in" link back to login (inside the form)
    const loginLink = page.getByTestId("register-form").getByRole("link", { name: /log in/i });
    await expect(loginLink).toBeVisible({ timeout: 15000 });
    await loginLink.click();

    await page.waitForURL("**/iniciar-sessio", {
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("navbar login button navigates to login page", async ({ page }) => {
    await page.goto("/en", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const loginButton = page
      .locator("#site-navbar")
      .getByRole("link", { name: /log in/i });

    await expect(loginButton).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await loginButton.click();

    await page.waitForURL("**/iniciar-sessio", {
      timeout: process.env.CI ? 30000 : 15000,
    });
  });

  test("profile page shows claim CTA when not authenticated", async ({
    page,
  }) => {
    await page.goto("/en/perfil/razzmatazz", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("profile-header")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Dismiss social follow popup if present
    const dismissButton = page.getByRole("button", { name: /not now/i }).first();
    if (await dismissButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismissButton.click();
    }

    // Claim CTA should be visible for unauthenticated users
    await expect(
      page.getByText(/is this your venue|és el teu local/i)
    ).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });

    // The CTA login link should point to login with redirect
    const claimLink = page.locator('a[href*="iniciar-sessio"][href*="redirect"]').first();
    await expect(claimLink).toBeVisible();
    const href = await claimLink.getAttribute("href");
    expect(href).toContain("perfil/razzmatazz");
  });

  test("profile page shows edit button after login as owner", async ({
    page,
  }) => {
    // Login first
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.getByLabel(/email/i).fill("dev@test.com");
    await page.getByLabel(/password/i).fill("dev");
    await page.getByTestId("login-form").getByRole("button", { name: /log in/i }).click();

    // Should redirect to home and show avatar
    await page.waitForURL("**/en", { timeout: process.env.CI ? 30000 : 15000 });
    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Navigate to profile via avatar dropdown (client-side nav preserves auth state)
    await page.getByTestId("user-avatar-button").click();
    await expect(page.getByTestId("user-dropdown-menu")).toBeVisible({ timeout: 5000 });
    const profileLink = page.getByTestId("user-dropdown-menu").getByRole("link", { name: /profile|perfil/i });
    await profileLink.click();

    await page.waitForURL("**/perfil/razzmatazz", {
      timeout: process.env.CI ? 30000 : 15000,
    });

    await expect(page.getByTestId("profile-header")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Dismiss social follow popup if present
    const dismissButton = page.getByRole("button", { name: /not now/i }).first();
    if (await dismissButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismissButton.click();
    }

    // Owner should see the disabled "Edit profile" button
    await expect(
      page.getByRole("button", { name: /edit profile|editar perfil/i })
    ).toBeVisible({
      timeout: process.env.CI ? 30000 : 15000,
    });

    // Claim CTA should NOT be visible (user is authenticated)
    await expect(
      page.getByText(/is this your venue/i)
    ).not.toBeVisible();
  });

  test("profile page renders with i18n in Spanish", async ({ page }) => {
    await page.goto("/es/perfil/razzmatazz", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("profile-header")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(
      page.getByTestId("profile-header").getByText(/verificado/i)
    ).toBeVisible();
  });
});
