import crypto from "crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Stripe test-mode helpers for payment E2E.
 *
 * Stripe Checkout's card form is protected by hCaptcha, and Stripe says its
 * hosted pages "have security measures in place that prevent automated
 * testing" (https://docs.stripe.com/automated-testing). So the specs drive
 * our UI up to Stripe's page, then pay the session the same way
 * `stripe trigger checkout.session.completed` does: a `tok_visa` payment
 * method confirmed through `/v1/payment_pages/{id}/confirm`. The session ends
 * up `complete` and `paid`, and Stripe emits its real events.
 */

const STRIPE_API = "https://api.stripe.com/v1";
const CHECKOUT_SESSION_ID = /\/(cs_test_[A-Za-z0-9]+)/;

type StripeCustomField = { id: string; key: string; optional: boolean };
type PaymentPage = {
  custom_fields?: StripeCustomField[];
  total_summary?: { due?: number };
};
export type PaidCheckout = { status: string; payment_status: string; success_url: string };
type StripeEventList = {
  data: { id: string; data: { object: { id: string } } }[];
};

async function stripeApi<T>(
  request: APIRequestContext,
  secretKey: string,
  path: string,
  form?: Record<string, string>,
): Promise<T> {
  const response = await request.fetch(`${STRIPE_API}${path}`, {
    method: form ? "POST" : "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
    form,
  });
  const body = await response.text();
  if (!response.ok()) {
    throw new Error(`Stripe ${path} returned ${response.status()}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body) as T;
}

/** The Checkout Session id in a checkout.stripe.com URL. */
export function checkoutSessionIdFromUrl(url: string): string {
  const id = new URL(url).pathname.match(CHECKOUT_SESSION_ID)?.[1];
  if (!id) throw new Error(`No test Checkout Session id in ${url}`);
  return id;
}

/**
 * Pay an open test-mode Checkout Session with Stripe's `tok_visa` card.
 * `textFields` fills required text custom fields by key (Stripe rejects the
 * confirm without them).
 */
export async function payCheckoutSession(
  request: APIRequestContext,
  secretKey: string,
  sessionId: string,
  textFields: Record<string, string> = {},
): Promise<PaidCheckout> {
  const page = await stripeApi<PaymentPage>(request, secretKey, `/payment_pages/${sessionId}`);
  const paymentMethod = await stripeApi<{ id: string }>(request, secretKey, "/payment_methods", {
    type: "card",
    "card[token]": "tok_visa",
    "billing_details[email]": "e2e-payments@example.com",
    "billing_details[name]": "E2E Payments",
  });
  const form: Record<string, string> = {
    payment_method: paymentMethod.id,
    expected_amount: String(page.total_summary?.due ?? 0),
  };
  (page.custom_fields ?? []).forEach((field, index) => {
    const value = textFields[field.key];
    if (value === undefined) {
      if (!field.optional) throw new Error(`No value for required custom field ${field.key}`);
      return;
    }
    form[`custom_fields[${index}][custom_field_id]`] = field.id;
    form[`custom_fields[${index}][text]`] = value;
  });
  const paid = await stripeApi<PaidCheckout>(
    request,
    secretKey,
    `/payment_pages/${sessionId}/confirm`,
    form,
  );
  expect(paid.status).toBe("complete");
  expect(paid.payment_status).toBe("paid");
  return paid;
}

/** Wait for Stripe's real `checkout.session.completed` event for a session. */
export async function waitForCheckoutCompletedEvent(
  request: APIRequestContext,
  secretKey: string,
  sessionId: string,
): Promise<string> {
  let raw = "";
  await expect
    .poll(
      async () => {
        const events = await stripeApi<StripeEventList>(
          request,
          secretKey,
          "/events?type=checkout.session.completed&limit=20",
        );
        const event = events.data.find((e) => e.data.object.id === sessionId);
        if (event) {
          raw = JSON.stringify(
            await stripeApi<unknown>(request, secretKey, `/events/${event.id}`),
          );
        }
        return Boolean(event);
      },
      { timeout: 60_000, intervals: [1_000, 2_000, 5_000] },
    )
    .toBe(true);
  return raw;
}

/** A `stripe-signature` header for `payload`, as Stripe signs webhooks (v1). */
export function signStripePayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Send Stripe's return redirects back to the app under test.
 *
 * Return URLs are built from the configured public origin (the backend's
 * PROMOTIONS_FRONTEND_BASE_URL, or NEXT_PUBLIC_SITE_URL when a production
 * build runs on localhost), so after Stripe the browser would leave the app
 * under test and lose its session cookies. Any top-level navigation to one of
 * `paths` on another origin is answered with a redirect to the same path and
 * query on `appOrigin`; it never reaches the configured site.
 */
export async function routeReturnsToApp(
  page: Page,
  appOrigin: string,
  paths: RegExp,
): Promise<void> {
  await page.route(
    (url) => url.origin !== appOrigin && paths.test(url.pathname),
    (route) => {
      const target = new URL(route.request().url());
      return route.fulfill({
        status: 302,
        headers: { location: `${appOrigin}${target.pathname}${target.search}` },
      });
    },
  );
}
