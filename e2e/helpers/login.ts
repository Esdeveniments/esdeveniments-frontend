import type { Page } from "@playwright/test";

const PASSKEY_SETUP_PATH = /\/create-passkey(?:\/|$)/;
export const PASSKEY_NAV_CONTROL_SELECTOR = '[role="button"]';

export async function getPasskeySkipControl(page: Page) {
  const controls = page.locator(PASSKEY_NAV_CONTROL_SELECTOR);
  // Wait for the hosted page to render at least one navigation control before
  // checking the exact structure. A count of two is the verified Back + Skip
  // contract, and malformed markup fails with an actionable error.
  await controls.first().waitFor({ timeout: 15_000 });
  const count = await controls.count();
  if (count !== 2) {
    throw new Error(
      `Unexpected Logto passkey navigation controls: expected 2, found ${count}`,
    );
  }
  // SecondaryPageLayout renders Back first and optional Skip second.
  return controls.nth(1);
}

/** Return true while Logto is showing its optional passkey enrollment step. */
export function isPasskeySetupUrl(url: URL): boolean {
  return PASSKEY_SETUP_PATH.test(url.pathname);
}

/** Return true once Logto has redirected the browser back to this app. */
export function isLoginCompleteUrl(
  url: URL,
  appOrigin?: string,
): boolean {
  return (
    Boolean(appOrigin) &&
    url.origin === appOrigin &&
    !isPasskeySetupUrl(url) &&
    !/\/iniciar-sessio\/?$/.test(url.pathname) &&
    !url.pathname.startsWith("/api/auth/") &&
    !url.searchParams.has("auth_error")
  );
}

/**
 * Log in through Logto's hosted sign-in page (reached via the OIDC redirect
 * from /iniciar-sessio). Selectors target Logto's default sign-in experience
 * and may need adjusting if the hosted UI is customized. Handles both
 * single-step and identifier-then-password layouts.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  // Capture the app origin from the actual login-entry request. Do not infer
  // it from an auth-host naming convention: deployments may use any hostname.
  let appOrigin: string | undefined;
  const captureAppOrigin = (request: { url: () => string }) => {
    const url = new URL(request.url());
    if (/\/iniciar-sessio\/?$/.test(url.pathname)) {
      appOrigin = url.origin;
    }
  };
  page.on("request", captureAppOrigin);
  try {
    await page.goto("/en/iniciar-sessio", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } finally {
    page.off("request", captureAppOrigin);
  }
  if (!appOrigin) {
    throw new Error(
      "Could not determine the app origin from the /iniciar-sessio navigation",
    );
  }

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

  // Logto may show an optional passkey enrollment page immediately after a
  // successful password login. Accept that intermediate URL, dismiss the
  // enrollment step, then wait for the normal callback redirect.
  try {
    await page.waitForURL(
      (url) =>
        isLoginCompleteUrl(url, appOrigin) || isPasskeySetupUrl(url),
      { timeout: 30_000 },
    );

    if (isPasskeySetupUrl(new URL(page.url()))) {
      // Logto's PasskeySetup page renders Back and Skip as the two navigation
      // controls with role="button". The native passkey action is a real
      // <button>, so selecting the final role-button avoids labels, locale,
      // and CSS-module class names altogether.
      const skipPasskey = await getPasskeySkipControl(page);
      await skipPasskey.click();
      await page.waitForURL(
        (url) => isLoginCompleteUrl(url, appOrigin),
        { timeout: 30_000 },
      );
    }
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
