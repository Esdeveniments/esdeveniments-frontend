import { test, expect, type Page } from "@playwright/test";
import { createInbox, type Inbox } from "./helpers/inbox";
import { openHostedSignIn, waitForAppReturn } from "./helpers/login";

/**
 * Staging integration E2E: a brand-new account, from Logto's hosted sign-up
 * to a completed profile.
 *
 * Registers a fresh email address on the preproduction Logto tenant, reads
 * the verification code from a disposable inbox, sets a password, and comes
 * back to the app as a new user (profileCompleted: false, placeholder
 * username). Then onboards on /perfil/edita and checks the public profile.
 *
 * Every run leaves one Logto user and one backend user behind: neither
 * Logto (no Management API app for this repo) nor the backend can delete
 * them yet. They all use the `e2e-signup-` address prefix and the `e2e`
 * username prefix, so they are easy to find. Opt in with RUN_SIGNUP_E2E=1;
 * the nightly preproduction workflow sets it.
 */

type SessionUser = {
  email?: string;
  username: string;
  name: string;
  profileCompleted?: boolean;
};

// Traces record fill() arguments, including the new account's password.
test.use({ trace: "off" });

async function sessionUser(page: Page): Promise<SessionUser> {
  return page.evaluate(async () => {
    const response = await fetch(`/api/auth/me?cb=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`/api/auth/me returned ${response.status}`);
    return (await response.json()).user;
  });
}

test.describe("Sign-up and onboarding (staging)", () => {
  test.skip(process.env.RUN_SIGNUP_E2E !== "1", "Set RUN_SIGNUP_E2E=1: each run creates a real preproduction account");
  test.setTimeout(240_000);

  let inbox: Inbox | undefined;

  test.afterAll(async () => {
    await inbox?.dispose();
  });

  test("a new account signs up, verifies its email and completes its profile", async ({ page }) => {
    inbox = await createInbox("e2e-signup");
    const password = `E2e-${crypto.randomUUID()}`;
    const username = `e2e${Date.now().toString(36)}`;
    const displayName = `E2E Signup ${username}`;

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

    const fresh = await sessionUser(page);
    expect(fresh.email).toBe(inbox.address);
    expect(fresh.profileCompleted).toBe(false);
    expect(fresh.username).toMatch(/^user-/);

    // Until onboarding is done, the profile link opens the completion form.
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    const profileLink = page.getByTestId("desktop-avatar-link");
    await expect(profileLink).toHaveAttribute("href", "/en/perfil/edita");
    await profileLink.click();

    await expect(page.getByRole("heading", { name: "Complete your profile" })).toBeVisible();
    const usernameField = page.getByLabel("Username");
    await expect(usernameField).toHaveValue(fresh.username);
    await expect(usernameField).toBeEditable();
    await usernameField.fill(username);
    await page.getByLabel("Display name").fill(displayName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Profile updated successfully." })).toBeVisible();

    const onboarded = await sessionUser(page);
    expect(onboarded).toMatchObject({ username, name: displayName, profileCompleted: true });

    await page.reload({ waitUntil: "domcontentloaded" });
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
