import type { Page } from "@playwright/test";

/**
 * Log in through Logto's hosted sign-in page (reached via the OIDC redirect
 * from /iniciar-sessio). Selectors target Logto's default sign-in experience
 * and may need adjusting if the hosted UI is customized. Handles both
 * single-step and identifier-then-password layouts.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/en/iniciar-sessio", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const identifier = page
    .locator('input[name="identifier"], input[type="email"], input[type="text"]')
    .first();
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(email);
  await page
    .getByRole("button", { name: /continue|sign in|log in|next|entra/i })
    .first()
    .click();

  // Password may be on a second step or the same form.
  const password_ = page.locator('input[type="password"]').first();
  await password_.waitFor({ timeout: 15_000 });
  await password_.fill(password);
  await page
    .getByRole("button", { name: /sign in|log in|continue|submit|entra/i })
    .first()
    .click();

  // Wait until Logto redirects back to the app (off the auth domain / OIDC).
  try {
    await page.waitForURL(
      (url) =>
        !/\/oidc\//.test(url.pathname) &&
        !url.host.startsWith("auth-") &&
        !url.pathname.includes("/iniciar-sessio"),
      { timeout: 30_000 },
    );
  } catch (timeoutError) {
    // A stuck-on-Logto timeout is ambiguous by itself — surface the actual
    // reason (usually a stale/unverified test-user password) instead of a
    // bare "Timeout 30000ms exceeded" that sends the next person spelunking
    // through API response logs.
    const invalidCredentials = page
      .getByText(/incorrect account or password|invalid.?credentials/i)
      .first();
    if (await invalidCredentials.isVisible().catch(() => false)) {
      throw new Error(
        "Logto rejected E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD (\"Incorrect account or " +
          "password\"). This is a staging test-user credentials problem, not an app bug — " +
          "verify the account exists and its email is verified in the preproduction Logto " +
          "tenant, and that the `staging` GitHub environment secret matches its password " +
          "(see scripts/e2e-staging-setup.sh).",
        { cause: timeoutError },
      );
    }
    throw timeoutError;
  }
}
