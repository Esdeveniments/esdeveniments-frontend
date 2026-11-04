import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { cleanupEvent, publishTestEvent } from "./helpers/publish";

/**
 * Staging integration E2E: real Logto session lifecycle.
 *
 * Exercises logout, silent refresh of a missing access token, concurrent
 * refresh from two tabs, refresh-token rotation and terminal failures against
 * the real Logto tenant. It reads and clears cookies but never prints values.
 *
 * Requires E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD. Skips without them.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;

const ACCESS = "auth_token";
const REFRESH = "auth_refresh_token";
const ID = "logto_id_token";

async function cookieValue(context: BrowserContext, name: string) {
  return (await context.cookies()).find((c) => c.name === name)?.value;
}

async function dropCookies(context: BrowserContext, names: string[]) {
  const keep = (await context.cookies()).filter((c) => !names.includes(c.name));
  await context.clearCookies();
  await context.addCookies(keep);
}

async function meStatus(page: Page): Promise<number> {
  return page.evaluate(async () => (await fetch("/api/auth/me")).status);
}

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

test.describe("Session lifecycle (staging)", () => {
  test.skip(
    !email || !password,
    "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set",
  );
  test.setTimeout(240_000);

  test("sign-out clears the session and leaves publishing in guest mode", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    const origin = new URL(page.url()).origin;
    expect(await meStatus(page)).toBe(200);
    expect(await cookieValue(context, ACCESS)).toBeTruthy();

    await page.goto("/api/auth/sign-out", { waitUntil: "commit" });
    await page.waitForURL((url) => url.origin === origin, { timeout: 60_000 });

    expect(await meStatus(page)).toBe(401);
    for (const name of [ACCESS, REFRESH, ID]) {
      expect(await cookieValue(context, name), `${name} must be cleared`).toBeFalsy();
    }

    await page.goto("/en/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("publish-early-sign-in")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a missing access token is refreshed silently and the refresh token rotates", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    const refreshBefore = await cookieValue(context, REFRESH);
    expect(refreshBefore).toBeTruthy();

    await dropCookies(context, [ACCESS]);
    expect(await meStatus(page)).toBe(200);
    expect(await cookieValue(context, ACCESS), "new access token issued").toBeTruthy();
    expect(await cookieValue(context, REFRESH)).not.toBe(refreshBefore);

    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await meStatus(page)).toBe(200);
  });

  test("two tabs refreshing from the refresh token alone at once both stay signed in", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    const second = await context.newPage();
    await second.goto("/en", { waitUntil: "domcontentloaded" });

    // ID and access cookies deleted: only the refresh token is left.
    await dropCookies(context, [ACCESS, ID]);
    const statuses = await Promise.all(
      [page, second, page, second, page, second].map((p) => meStatus(p)),
    );
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);

    expect(await meStatus(page)).toBe(200);
    expect(await meStatus(second)).toBe(200);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("desktop-avatar-link")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a refresh token revoked by sign-out fails terminally and recovers to a login prompt", async ({
    page,
    context,
    browser,
  }) => {
    await loginViaUI(page, email!, password!);
    const origin = new URL(page.url()).origin;
    const revokedRefresh = await cookieValue(context, REFRESH);
    expect(revokedRefresh).toBeTruthy();

    await page.goto("/api/auth/sign-out", { waitUntil: "commit" });
    await page.waitForURL((url) => url.origin === origin, { timeout: 60_000 });

    const replay = await browser.newContext({ baseURL: origin });
    const replayPage = await replay.newPage();
    try {
      await replay.addCookies([{ name: REFRESH, value: revokedRefresh!, url: origin }]);
      await replayPage.goto("/en", { waitUntil: "domcontentloaded" });
      // Concurrent requests carrying the same dead token must all fail fast.
      const started = Date.now();
      const statuses = await Promise.all([1, 2, 3].map(() => meStatus(replayPage)));
      expect(statuses).toEqual([401, 401, 401]);
      expect(Date.now() - started, "no claim wait").toBeLessThan(15_000);
      expect(await cookieValue(replay, REFRESH), "dead token is cleared").toBeFalsy();

      await replayPage.goto("/en/publica", { waitUntil: "domcontentloaded" });
      await expect(replayPage.getByTestId("publish-early-sign-in")).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await replay.close();
    }
  });

  test("no session cookies at all: 401, login prompt, no redirect loop", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    await dropCookies(context, [ACCESS, REFRESH, ID]);

    expect(await meStatus(page)).toBe(401);

    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });
    await page.goto("/en/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("publish-early-sign-in")).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(3_000);
    expect(navigations, "no navigation loop").toBeLessThanOrEqual(3);
  });

  test("a corrupted refresh token with no other cookies ends the session cleanly", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    const origin = new URL(page.url()).origin;
    await dropCookies(context, [ACCESS, REFRESH, ID]);
    await context.addCookies([
      { name: REFRESH, value: `not-a-valid-token-${Date.now()}`, url: origin },
    ]);

    const started = Date.now();
    const statuses = await Promise.all([1, 2, 3].map(() => meStatus(page)));
    expect(statuses).toEqual([401, 401, 401]);
    expect(Date.now() - started, "no claim wait").toBeLessThan(15_000);
    await page.goto("/en/publica", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("publish-early-sign-in")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("owner pages recover when the access token is gone", async ({
    page,
    context,
  }) => {
    await loginViaUI(page, email!, password!);
    const slug = await publishTestEvent(page, `Session Test Event e2e-${Date.now()}`);
    try {
      // Access token gone, refresh token valid: the owner page renews it itself.
      await dropCookies(context, [ACCESS]);
      await page.goto(`/en/e/${slug}/promote`, { waitUntil: "domcontentloaded" });
      await expect(
        page
          .getByTestId("promote-confirm-button")
          .or(page.getByTestId("promote-unavailable")),
      ).toBeVisible({ timeout: 45_000 });

      // Access and refresh tokens gone, ID token still valid: the owner page must
      // explain itself and stop, not loop or render blank.
      await dropCookies(context, [ACCESS, REFRESH]);
      let navigations = 0;
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) navigations += 1;
      });
      await page.goto(`/en/e/${slug}/promote`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(8_000);
      expect(navigations, "no navigation loop").toBeLessThanOrEqual(3);
      await expect(page.getByTestId("app-content")).not.toBeEmpty();
      await expect(page.getByTestId("promote-confirm-button")).toHaveCount(0);
      await page.screenshot({ path: "test-results/session-no-tokens-owner.png" });
    } finally {
      // Restore a full session so the event can be deleted.
      const cleaner = await context.browser()!.newContext();
      const cleanerPage = await cleaner.newPage();
      try {
        await loginViaUI(cleanerPage, email!, password!);
        await cleanupEvent(cleanerPage, slug);
      } finally {
        await cleaner.close();
      }
    }
  });
});
