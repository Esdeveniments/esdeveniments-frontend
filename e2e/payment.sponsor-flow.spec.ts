import { test, expect, type Page } from "@playwright/test";
import { isPaymentE2EEnabled, readPaymentEnv } from "./helpers/paymentEnv";
import { DEFAULT_IMAGE } from "./helpers/publish";
import {
  checkoutSessionIdFromUrl,
  payCheckoutSession,
  routeReturnsToApp,
  signStripePayload,
  waitForCheckoutCompletedEvent,
} from "./helpers/stripe";
import { tursoExecute } from "./helpers/turso";

/**
 * Payment E2E: buy a sponsor banner from /patrocina to a live banner.
 *
 * Drives our UI to Stripe's hosted page, pays the session in test mode (see
 * helpers/stripe.ts for why not through the card form), follows Stripe's
 * success URL, forwards Stripe's real checkout.session.completed event to our
 * webhook (no Stripe webhook endpoint reaches a CI or local server), uploads
 * the banner and checks the place page serves it. Also covers the cancel path.
 *
 * Needs an E2E_TEST_MODE app (the banner upload is stubbed) and the test
 * Stripe and Turso settings. Gated by RUN_PAYMENT_E2E=1 like the other
 * payment specs.
 */

// Towns no other spec renders. The first one with no active sponsor is used.
const CANDIDATE_PLACES = [
  { slug: "cardedeu", name: "Cardedeu" },
  { slug: "vic", name: "Vic" },
  { slug: "manresa", name: "Manresa" },
];
const RETURN_PATHS = /\/patrocina\/(upload|cancelled)$/;
const E2E_BUSINESS_PREFIX = "E2E Sponsor";

// Traces keep API request headers, and the Stripe and Turso calls carry
// secrets in Authorization. CI uploads the report from public-repo runs.
test.use({ trace: "off" });

async function pickFreePlace(page: Page) {
  const response = await page.request.get("/api/sponsors/availability");
  expect(response.ok(), "sponsor availability must load").toBe(true);
  const { occupied } = (await response.json()) as { occupied: Record<string, number> };
  const place = CANDIDATE_PLACES.find((p) => !(p.slug in occupied));
  if (!place) throw new Error("Every candidate place already has a sponsor");
  return place;
}

/** Choose a place and the 7-day plan on /patrocina; ends on Stripe's page. */
async function startCheckout(page: Page, place: { name: string }) {
  await page.goto("/en/patrocina", { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder("Search for a town or region...");
  await expect(search).toBeEnabled({ timeout: 30_000 });
  await search.fill(place.name);
  await page
    .getByRole("button", { name: new RegExp(`^${place.name}\\s*Town$`) })
    .click();
  const plan = page
    .locator(".card-bordered")
    .filter({ has: page.getByRole("heading", { name: "7 days", exact: true }) });
  await plan.getByRole("button", { name: "Get started" }).click();
  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 60_000 });
  return checkoutSessionIdFromUrl(page.url());
}

test.describe("Sponsor purchase (Stripe test mode)", () => {
  test.skip(!isPaymentE2EEnabled(), "Set RUN_PAYMENT_E2E=1 to enable payment E2E tests");
  // Both tests book the same free town; running them at once could race.
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let sessionId: string | null = null;

  test.beforeAll(async ({ request }) => {
    readPaymentEnv();
    // A run that died before its cleanup must not keep a town booked. The
    // hour keeps a run in progress elsewhere on the shared test database.
    await tursoExecute(
      request,
      "DELETE FROM sponsors WHERE business_name LIKE ? AND created_at < datetime('now', '-1 hour')",
      [`${E2E_BUSINESS_PREFIX} %`],
    );
  });

  test.afterAll(async ({ request }) => {
    if (!sessionId) return;
    await tursoExecute(request, "DELETE FROM sponsors WHERE stripe_session_id = ?", [sessionId]);
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await routeReturnsToApp(page, new URL(baseURL!).origin, RETURN_PATHS);
  });

  test("leaving Stripe's page lands on the cancel page", async ({ page }) => {
    await startCheckout(page, await pickFreePlace(page));

    // Stripe's "Back to Esdeveniments" link points at our cancel_url.
    await page.locator('a[href$="/patrocina/cancelled"]').click();

    await expect(page).toHaveURL(/\/en\/patrocina\/cancelled$/);
    await expect(page.getByRole("heading", { name: "Payment cancelled" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      /\/patrocina#pricing$/,
    );
  });

  test("a paid checkout becomes a live banner on the place page", async ({ page, request }) => {
    const env = readPaymentEnv();
    const place = await pickFreePlace(page);
    const businessName = `${E2E_BUSINESS_PREFIX} ${Date.now()}`;
    const targetUrl = "https://example.com/e2e-sponsor";

    sessionId = await startCheckout(page, place);
    await expect(page.locator('a[href$="/patrocina/cancelled"]')).toBeVisible();

    const paid = await payCheckoutSession(request, env.stripeSecretKey, sessionId, {
      business_name: businessName,
      target_url: targetUrl,
    });
    const successUrl = new URL(paid.success_url);
    expect(successUrl.pathname).toBe("/en/patrocina/upload");
    expect(successUrl.searchParams.get("place")).toBe(place.slug);

    // Stripe sends the buyer to success_url; routeReturnsToApp keeps it here.
    await page.goto(paid.success_url, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Payment completed!" })).toBeVisible();

    // Stripe would POST this event to the webhook endpoint configured for the
    // deployment. Forward the real one, signed with the app's webhook secret.
    const event = await waitForCheckoutCompletedEvent(request, env.stripeSecretKey, sessionId);
    const webhook = await request.post("/api/sponsors/webhook", {
      headers: {
        "content-type": "application/json",
        "stripe-signature": signStripePayload(event, env.stripeWebhookSecret),
      },
      data: event,
    });
    expect(webhook.status(), await webhook.text()).toBe(200);

    const [pending] = await tursoExecute(
      request,
      "SELECT status, business_name, target_url, places FROM sponsors WHERE stripe_session_id = ?",
      [sessionId],
    );
    expect(pending).toEqual({
      status: "pending_image",
      business_name: businessName,
      target_url: targetUrl,
      places: JSON.stringify([place.slug]),
    });

    await page.locator('input[type="file"]').setInputFiles(DEFAULT_IMAGE);
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page.getByText("Image uploaded successfully.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/en\/patrocina\/success$/);
    await expect(page.getByRole("heading", { name: "All set!" })).toBeVisible();

    const [active] = await tursoExecute(
      request,
      "SELECT status FROM sponsors WHERE stripe_session_id = ?",
      [sessionId],
    );
    expect(active?.status).toBe("active");

    // The server picks the paid sponsor for the town. Read the HTML: in E2E
    // mode the uploaded image is a stub URL, and the banner hides itself in
    // the browser once that image fails to load.
    const placeHtml = await (await request.get(`/en/${place.slug}`)).text();
    expect(placeHtml).toContain(`data-analytics-sponsor-name="${businessName}"`);
    expect(placeHtml).toContain(`href="${targetUrl}"`);
  });
});
