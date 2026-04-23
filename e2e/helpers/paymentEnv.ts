/**
 * Env preflight for payment E2E tests.
 *
 * Gates real-Stripe + test-Turso specs behind RUN_PAYMENT_E2E=1 so they never
 * run by accident locally. When the flag is set, any missing variable aborts
 * the suite with a concrete list — which is the exact failure mode the
 * previous silent-misconfiguration bug needed.
 */

const REQUIRED_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "PLAYWRIGHT_TEST_BASE_URL",
] as const;

export type PaymentEnv = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  tursoDatabaseUrl: string;
  tursoAuthToken: string;
  baseUrl: string;
};

export function isPaymentE2EEnabled(): boolean {
  return process.env.RUN_PAYMENT_E2E === "1";
}

export function readPaymentEnv(): PaymentEnv {
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `Payment E2E is enabled (RUN_PAYMENT_E2E=1) but required env vars are missing: ${missing.join(
        ", ",
      )}.\n` +
        `Set them in GitHub Secrets (CI) or your local shell. Stripe keys must be test-mode.`,
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;
  if (!stripeSecretKey.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a test-mode key (starts with 'sk_test_'). " +
        "Refusing to run payment E2E against live Stripe.",
    );
  }

  return {
    stripeSecretKey,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET as string,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL as string,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN as string,
    baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL as string,
  };
}
