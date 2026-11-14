import { test, expect, type Page } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { cleanupEvent, fetchStoredEvent, publishTestEvent } from "./helpers/publish";
import {
  checkoutSessionIdFromUrl,
  payCheckoutSession,
  routeReturnsToApp,
} from "./helpers/stripe";

/**
 * Staging integration E2E: promote an event you own.
 *
 * Real login, real publish, real backend promotion options and checkout. The
 * owner leaves Stripe's page, lands on /promote/cancel and resumes the same
 * checkout. Then the session is paid in Stripe test mode (see
 * helpers/stripe.ts) and the promotion must turn ACTIVE (backend webhook, or
 * its 60 s reconciliation against Stripe) and show in the public promoted list.
 *
 * Requires E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD (same account as
 * publish-integration.spec.ts, with a completed profile). The payment test
 * also needs E2E_PROMOTION_STRIPE_SECRET_KEY (a test-mode key of the Stripe
 * account the preproduction backend uses) and NEXT_PUBLIC_API_URL /
 * BACKEND_SERVICE_SECRET to read the promoted list. Each part skips without
 * its settings.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const serviceKey = process.env.BACKEND_SERVICE_SECRET;
const promotionStripeKey = process.env.E2E_PROMOTION_STRIPE_SECRET_KEY;
// The backend builds Stripe's return URLs from PROMOTIONS_FRONTEND_BASE_URL
// (staging), not from the app under test.
const RETURN_PATHS = /\/promote\/(success|cancel)$/;

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

async function signIn(page: Page) {
  await loginViaUI(page, email!, password!);
  await routeReturnsToApp(page, new URL(page.url()).origin, RETURN_PATHS);
}

test.describe("Promotion checkout (staging)", () => {
  test.skip(
    !email || !password,
    "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set",
  );
  // The payment test pays the checkout the first test opened.
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  let slug: string | null = null;
  let sessionId: string | null = null;

  test.afterAll(async ({ browser }) => {
    // Hooks get the config timeout (30 s); this one signs in through Logto.
    test.setTimeout(120_000);
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

  test("owner leaves Stripe and resumes the same checkout", async ({ page }) => {
    await signIn(page);
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

    // A town promotion, so the payment test knows which list to check.
    await page.getByTestId("promote-tab-CITY").click();
    await page.getByRole("tabpanel").getByRole("radio").first().check();
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
    sessionId = checkoutSessionIdFromUrl(page.url());
    await page.screenshot({ path: "test-results/promotion-stripe.png" });

    // Stripe's back link is the cancel_url the backend set.
    await page.locator('a[href$="/promote/cancel"]').click();
    await expect(page).toHaveURL(new RegExp(`/e/${slug}/promote/cancel$`));
    await expect(page.getByTestId("promotion-status")).toHaveAttribute(
      "data-status",
      "PENDING",
    );

    await page.locator('a[href^="https://checkout.stripe.com/"]').click();
    await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//);
    expect(checkoutSessionIdFromUrl(page.url()), "resumes the same session").toBe(sessionId);
  });

  test("a paid checkout turns the promotion on", async ({ page, request }) => {
    test.skip(
      !promotionStripeKey || !apiUrl || !serviceKey,
      "Skipped: E2E_PROMOTION_STRIPE_SECRET_KEY, NEXT_PUBLIC_API_URL or BACKEND_SERVICE_SECRET not set",
    );
    expect(promotionStripeKey).toMatch(/^sk_test_/);
    await signIn(page);

    const paid = await payCheckoutSession(request, promotionStripeKey!, sessionId!);
    expect(new URL(paid.success_url).pathname).toBe(`/e/${slug}/promote/success`);

    await page.goto(paid.success_url, { waitUntil: "domcontentloaded" });
    const status = page.getByTestId("promotion-status");
    await expect(status).toBeVisible({ timeout: 30_000 });
    // The return page reads the backend, never Stripe's redirect, so it can
    // show PENDING or PAID until the backend sees the payment.
    await expect
      .poll(
        async () => {
          await page.reload({ waitUntil: "domcontentloaded" });
          return status.getAttribute("data-status");
        },
        { timeout: 180_000, intervals: [5_000, 10_000] },
      )
      .toBe("ACTIVE");

    const { city } = await fetchStoredEvent(slug!);
    const promoted = await request.get(
      `${apiUrl}/events/promoted?placement=CITY&cityId=${city.id}&size=50`,
      { headers: { "X-Backend-Key": serviceKey! } },
    );
    expect(promoted.ok()).toBe(true);
    const slugs = ((await promoted.json()) as { slug: string }[]).map((e) => e.slug);
    expect(slugs, "the promoted list for the town includes the event").toContain(slug);
  });
});
