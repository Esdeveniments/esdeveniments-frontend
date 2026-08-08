import { expect, type Page } from "@playwright/test";

const APP_REDIRECT_TIMEOUT = 30_000;
const SESSION_READY_TIMEOUT = 30_000;

function isAppUrl(url: URL): boolean {
  return url.pathname === "/en" || url.pathname === "/en/";
}

async function pageDiagnostics(page: Page): Promise<string> {
  const diagnostics = await page
    .evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
    }))
    .catch(() => ({ url: page.url(), readyState: "unavailable" }));

  return `url=${diagnostics.url}, readyState=${diagnostics.readyState}`;
}

async function assertAuthenticatedSession(page: Page): Promise<void> {
  let lastSessionCheck = "not checked";
  try {
    await expect
      .poll(
        async () => {
          const state = await page.evaluate(async () => {
            try {
              const response = await fetch("/api/auth/me", {
                credentials: "include",
                cache: "no-store",
              });
              const body = await response.text();
              if (!response.ok) {
                return { authenticated: false, detail: `status=${response.status}` };
              }
              try {
                const data = JSON.parse(body) as { user?: unknown };
                return {
                  authenticated: Boolean(data.user),
                  detail: data.user ? "user present" : "response has no user",
                };
              } catch {
                return { authenticated: false, detail: "invalid JSON response" };
              }
            } catch (error) {
              return {
                authenticated: false,
                detail: `request failed: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          });
          lastSessionCheck = state.detail;
          return state.authenticated;
        },
        {
          timeout: SESSION_READY_TIMEOUT,
          intervals: [250, 500, 1_000, 2_000],
        },
      )
      .toBe(true);
  } catch (error) {
    throw new Error(
      `OIDC callback reached the app, but /api/auth/me did not confirm an authenticated session (${lastSessionCheck}; ${await pageDiagnostics(page)}).`,
      { cause: error },
    );
  }
}

async function throwLoginError(page: Page, cause: unknown): Promise<never> {
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
      { cause },
    );
  }

  throw new Error(
    `Logto login did not reach a usable application session (${await pageDiagnostics(page)}).`,
    { cause },
  );
}

// This helper intentionally waits for the OIDC navigation to commit, not for
// the destination's complete `load` event. The authenticated application state
// is established by /api/auth/me below, which is the contract the app itself
// uses instead of an incidental page-load milestone.
async function waitForAppRedirect(page: Page): Promise<void> {
  try {
    await Promise.all([
      page.waitForURL(isAppUrl, {
        timeout: APP_REDIRECT_TIMEOUT,
        waitUntil: "commit",
      }),
      page
        .getByRole("button", { name: /sign in|log in|continue|submit|entra/i })
        .first()
        .click({ noWaitAfter: true }),
    ]);
  } catch (error) {
    // `waitForURL` also checks the current URL. If the app committed but the
    // waiter was interrupted by a later lifecycle problem, continue to the
    // authoritative session check rather than failing on page `load`.
    if (isAppUrl(new URL(page.url()))) return;
    await throwLoginError(page, error);
  }
}

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
  await waitForAppRedirect(page);
  await assertAuthenticatedSession(page);
}
