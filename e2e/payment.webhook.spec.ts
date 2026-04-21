import crypto from "crypto";
import { test, expect } from "@playwright/test";
import { isPaymentE2EEnabled, readPaymentEnv } from "./helpers/paymentEnv";

/**
 * Payment E2E — Stripe webhook handler.
 *
 * What this catches: mismatched STRIPE_WEBHOOK_SECRET (hottest source of
 * "worked in dev, broke in prod"), missing Turso wiring on the deployment
 * (createSponsor would throw → 500), and contract regressions in the
 * `/api/sponsors/webhook` signature path.
 *
 * Uses Stripe's v1 signature scheme to build synthetic, locally-signed
 * checkout.session.completed events — no Stripe CLI forwarding needed.
 *
 * @see lib/stripe/webhook.ts — computeSignature / verifyStripeSignature
 */

function buildSessionCompletedEvent(sessionId: string, placeSlug: string) {
  return {
    id: `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        payment_status: "paid",
        amount_total: 500,
        currency: "eur",
        // Leaving out payment_intent + custom_fields keeps the handler from
        // making a real Stripe API call (updatePaymentIntentMetadata).
        customer_details: { email: "e2e@example.com", name: "E2E Test" },
        metadata: {
          product: "sponsor_banner",
          duration: "7days",
          duration_days: "7",
          place: placeSlug,
          place_name: "E2E Test Place",
          geo_scope: "town",
        },
      },
    },
  };
}

function signPayload(
  payload: string,
  secret: string,
): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return { signature: `t=${timestamp},v1=${sig}`, timestamp };
}

test.describe("Payment webhook endpoint (signed synthetic events)", () => {
  test.skip(
    !isPaymentE2EEnabled(),
    "Set RUN_PAYMENT_E2E=1 to enable payment E2E tests",
  );

  test("accepts a properly signed checkout.session.completed event", async ({
    request,
  }) => {
    const env = readPaymentEnv();

    const sessionId = `cs_test_e2e_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const placeSlug = `e2e-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const payload = JSON.stringify(
      buildSessionCompletedEvent(sessionId, placeSlug),
    );
    const { signature } = signPayload(payload, env.stripeWebhookSecret);

    const res = await request.post("/api/sponsors/webhook", {
      headers: {
        "stripe-signature": signature,
        "content-type": "application/json",
      },
      data: payload,
    });

    expect(
      res.status(),
      `Webhook rejected or crashed: ${await res
        .text()
        .catch(() => "<no body>")}`,
    ).toBe(200);

    // Replaying the same event must also return 200 (idempotent path goes
    // through findSponsorBySessionId → proves DB connectivity end-to-end).
    const replay = await request.post("/api/sponsors/webhook", {
      headers: {
        "stripe-signature": signPayload(payload, env.stripeWebhookSecret)
          .signature,
        "content-type": "application/json",
      },
      data: payload,
    });
    expect(replay.status()).toBe(200);
  });

  test("rejects a request with a tampered signature", async ({ request }) => {
    readPaymentEnv();

    const payload = JSON.stringify(
      buildSessionCompletedEvent(`cs_test_tamper_${Date.now()}`, "whatever"),
    );
    const bogusSig = `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`;

    const res = await request.post("/api/sponsors/webhook", {
      headers: {
        "stripe-signature": bogusSig,
        "content-type": "application/json",
      },
      data: payload,
    });

    expect(res.status()).toBe(400);
  });

  test("rejects a request with a missing signature header", async ({
    request,
  }) => {
    readPaymentEnv();

    const payload = JSON.stringify(
      buildSessionCompletedEvent(`cs_test_nosig_${Date.now()}`, "whatever"),
    );

    const res = await request.post("/api/sponsors/webhook", {
      headers: { "content-type": "application/json" },
      data: payload,
    });

    expect(res.status()).toBe(400);
  });
});
