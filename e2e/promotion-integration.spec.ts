import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { cleanupEvent, publishTestEvent } from "./helpers/publish";

/**
 * Staging integration E2E: promote an event you own.
 *
 * Real login, real publish, real backend promotion options/checkout. Stops at
 * Stripe's hosted page (test mode); it never enters card details.
 *
 * Requires E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD (same account as
 * publish-integration.spec.ts, with a completed profile). Skips without them.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

test.describe("Promotion checkout (staging)", () => {
  test.skip(
    !email || !password,
    "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set",
  );
  test.setTimeout(240_000);

  let slug: string | null = null;

  test.afterAll(async ({ browser }) => {
    if (!slug) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await loginViaUI(page, email!, password!);
      await cleanupEvent(page, slug);
    } catch (error) {
      console.warn("Cleanup failed:", error);
    } finally {
      await context.close();
    }
  });

  test("owner picks an option and is sent to Stripe Checkout", async ({
    page,
  }) => {
    await loginViaUI(page, email!, password!);
    slug = await publishTestEvent(page, `Promo Test Event e2e-${Date.now()}`);

    await page.goto(`/en/e/${slug}/promote`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const confirm = page.getByTestId("promote-confirm-button");
    await expect(
      confirm.or(page.getByTestId("promote-unavailable")),
    ).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/promotion-options.png" });
    await expect(confirm, "promotion options must be purchasable").toBeVisible();

    await expect(page.getByRole("radio").first()).toBeVisible();
    await confirm.click();

    // Next's route announcer is an empty role="alert"; the checkout error has text.
    const rejection = page.locator('[role="alert"]:not(:empty)');
    await Promise.race([
      page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, {
        timeout: 60_000,
      }),
      rejection.waitFor({ state: "visible", timeout: 60_000 }).then(async () => {
        await page.screenshot({ path: "test-results/promotion-rejected.png" });
        throw new Error(`Checkout was rejected: ${await rejection.innerText()}`);
      }),
    ]);
    expect(new URL(page.url()).hostname).toBe("checkout.stripe.com");
    await page.screenshot({ path: "test-results/promotion-stripe.png" });
  });
});
