import { test, expect, type Page } from "@playwright/test";
import { createInbox, type Inbox } from "./helpers/inbox";
import { completeHostedLogin, loginViaUI, openHostedSignIn, waitForAppReturn } from "./helpers/login";
import { cleanupEvent, clickArmedPublish, prepareTestEvent } from "./helpers/publish";

/**
 * Staging integration E2E: a brand-new account, from Logto's hosted sign-up
 * to a completed profile and a published event.
 *
 * One new account walks every onboarding edge case: the sign-up lands on the
 * profile form (backend `profileCompleted: false`); logging out there and
 * signing in again from a guest's publish click lands on it again, carrying
 * the publish draft as `redirect`; a taken username is refused; saving a free
 * one returns to the draft, which publishes. The verification code comes from
 * a disposable inbox.
 *
 * Every run leaves one Logto user and one backend user behind: neither
 * Logto (no Management API app for this repo) nor the backend can delete
 * them yet. They all use the `e2e-signup-` address prefix and the `e2e`
 * username prefix, so they are easy to find. Opt in with RUN_SIGNUP_E2E=1.
 * The taken-username check also signs in as E2E_STAGING_EMAIL to read a real
 * username, and skips without it.
 */

type SessionUser = {
  email?: string;
  username: string;
  name: string;
  profileCompleted?: boolean;
};

const stagingEmail = process.env.E2E_STAGING_EMAIL;
const stagingPassword = process.env.E2E_STAGING_PASSWORD;

// Traces record fill() arguments, including the new account's password.
test.use({ trace: "off" });

async function sessionUser(page: Page): Promise<SessionUser | null> {
  return page.evaluate(async () => {
    const response = await fetch(`/api/auth/me?cb=${Date.now()}`, { cache: "no-store" });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`/api/auth/me returned ${response.status}`);
    return (await response.json()).user;
  });
}

async function expectOnboarding(page: Page, redirect: string) {
  await expect(page).toHaveURL((url) =>
    url.pathname === "/en/perfil/edita" && url.searchParams.get("redirect") === redirect,
  );
  await expect(page.getByRole("heading", { name: "Complete your profile" })).toBeVisible();
}

test.describe("Sign-up and onboarding (staging)", () => {
  test.skip(process.env.RUN_SIGNUP_E2E !== "1", "Set RUN_SIGNUP_E2E=1: each run creates a real preproduction account");
  test.setTimeout(360_000);

  const password = `E2e-${crypto.randomUUID()}`;
  let inbox: Inbox | undefined;
  let takenUsername: string | undefined;
  let slug: string | undefined;

  test.beforeAll(async ({ browser }) => {
    if (!stagingEmail || !stagingPassword) return;
    const page = await browser.newPage();
    try {
      await loginViaUI(page, stagingEmail, stagingPassword);
      takenUsername = (await sessionUser(page))?.username;
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    await inbox?.dispose();
    if (!slug || !inbox) return;
    // The new account owns the event; its cookies are gone with the test page.
    const page = await browser.newPage();
    try {
      const appOrigin = await openHostedSignIn(page);
      await completeHostedLogin(page, inbox.address, password, appOrigin);
      await cleanupEvent(page, slug);
    } catch (error) {
      console.warn("Cleanup failed:", error);
    } finally {
      await page.close();
    }
  });


  test("a new account is onboarded on sign-up and on every sign-in until it completes its profile", async ({ page }) => {
    inbox = await createInbox("e2e-signup");
    const username = `e2e${Date.now().toString(36)}`;
    const displayName = `E2E Signup ${username}`;

    // Sign up from the login entry, which returns to /en.
    const appOrigin = await openHostedSignIn(page);
    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/register(?:\?|$)/);
    // Logto's identifier box has no accessible name; its "Email" label isn't linked.
    await page.locator('input[name="identifier"]').fill(inbox.address);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/register\/verification-code/);
    const code = await inbox.waitForCode();
    // Logto's six code boxes move the focus along as you type.
    await page.locator('input[name="passcode_0"]').click();
    await page.keyboard.type(code);

    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible({ timeout: 30_000 });
    await passwordField.fill(password);
    await page.getByRole("button", { name: "Save password" }).click();
    await waitForAppReturn(page, appOrigin);

    await expectOnboarding(page, "/");
    const fresh = await sessionUser(page);
    expect(fresh).toMatchObject({ email: inbox.address, profileCompleted: false });
    expect(fresh!.username).toMatch(/^user-/);
    await expect(page.getByLabel("Username")).toHaveValue(fresh!.username);
    await expect(page.getByLabel("Username")).toBeEditable();
    await expect(page.getByTestId("desktop-avatar-link")).toHaveAttribute("href", "/en/perfil/edita");

    // Log out from the onboarding page.
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL((url) => url.origin === appOrigin && !url.pathname.startsWith("/api/"), {
      timeout: 60_000,
    });
    expect(await sessionUser(page)).toBeNull();

    // As a guest, write an event and publish: sign-in comes first, and the
    // still-incomplete profile sends the account through onboarding again.
    await prepareTestEvent(page, `Signup Test Event e2e-${Date.now()}`);
    await clickArmedPublish(page);
    await completeHostedLogin(page, inbox.address, password, appOrigin);
    await expectOnboarding(page, "/publica?resume=1");

    if (takenUsername) {
      await page.getByLabel("Username").fill(takenUsername);
      await page.getByLabel("Display name").fill(displayName);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("This username is already taken.")).toBeVisible();
      expect((await sessionUser(page))?.profileCompleted).toBe(false);
    } else {
      test.info().annotations.push({
        type: "skipped step",
        description: "taken username: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set",
      });
    }

    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Display name").fill(displayName);
    await page.getByRole("button", { name: "Save changes" }).click();

    // Saving returns to the draft, which then publishes.
    await page.waitForURL((url) => /^\/en\/e\/[^/]+$/.test(url.pathname), { timeout: 90_000 });
    slug = page.url().match(/\/e\/([^/?#]+)/)![1];
    expect(await sessionUser(page)).toMatchObject({ username, name: displayName, profileCompleted: true });

    await page.goto("/en/perfil/edita", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Edit your profile" })).toBeVisible();
    await expect(page.getByLabel("Username")).not.toBeEditable();
    await expect(page.getByTestId("desktop-avatar-link")).toHaveAttribute(
      "href",
      `/en/perfil/${username}`,
    );

    const profile = await page.goto(`/en/perfil/${username}`, { waitUntil: "domcontentloaded" });
    expect(profile?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
  });
});
