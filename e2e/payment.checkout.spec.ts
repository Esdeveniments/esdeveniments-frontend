import { test, expect } from "@playwright/test";
import { isPaymentE2EEnabled, readPaymentEnv } from "./helpers/paymentEnv";

/**
 * Payment E2E — Stripe Checkout Session creation.
 *
 * What this catches: misconfigured STRIPE_SECRET_KEY, missing
 * TURSO_DATABASE_URL (the endpoint calls `getOccupiedPlaceStatus` which reads
 * Turso), wrong `sk_live_` key in a test environment, and transport-level
 * regressions in `/api/sponsors/checkout`.
 *
 * Guarded by RUN_PAYMENT_E2E=1 — gated so local runs and PR-to-develop CI
 * don't accidentally hit Stripe. Enabled only on PRs to main (see ci.yml).
 */

test.describe("Payment checkout endpoint (Stripe test mode)", () => {
  test.skip(
    !isPaymentE2EEnabled(),
    "Set RUN_PAYMENT_E2E=1 to enable payment E2E tests",
  );

  test("POST /api/sponsors/checkout returns a Stripe test-mode session URL", async ({
    request,
  }) => {
    const env = readPaymentEnv();

    // Random slug per run avoids collisions with existing sponsors in the
    // test Turso DB (getOccupiedPlaceStatus would return 409 otherwise).
    const placeSlug = `e2e-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const res = await request.post("/api/sponsors/checkout", {
      headers: {
        // Unique visitor id → unique Stripe idempotency key → fresh session.
        "x-visitor-id": `e2e-visitor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        origin: env.baseUrl,
      },
      data: {
        duration: "7days",
        locale: "ca",
        place: placeSlug,
        placeName: "E2E Test Place",
        geoScope: "town",
      },
    });

    expect(
      res.status(),
      `Checkout failed: ${await res.text().catch(() => "<no body>")}`,
    ).toBe(200);

    const body = (await res.json()) as { url?: string; sessionId?: string };
    expect(body.url, "expected Stripe checkout URL in response").toBeTruthy();
    expect(body.sessionId).toMatch(/^cs_test_/);
    expect(
      body.url,
      "expected Stripe-hosted checkout URL",
    ).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test("POST /api/sponsors/checkout rejects invalid geoScope with 400", async ({
    request,
  }) => {
    const env = readPaymentEnv();

    const res = await request.post("/api/sponsors/checkout", {
      headers: {
        "x-visitor-id": `e2e-visitor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        origin: env.baseUrl,
      },
      data: {
        duration: "7days",
        locale: "ca",
        place: "mataro",
        placeName: "Mataró",
        geoScope: "galaxy",
      },
    });

    expect(res.status()).toBe(400);
  });
});
