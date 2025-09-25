// Temporary ambient module for 'stripe' while the real dependency is removed.
// Purpose: avoid TS2307 "Cannot find module 'stripe'" for dynamic imports in API routes.
// When re‑enabling Stripe: remove this file and install the official package `yarn add stripe`.

// We intentionally keep the surface minimal – only the members currently accessed in the codebase.
// Use `unknown` instead of `any` to comply with the no-explicit-any guideline; callers cast/narrow as needed.
declare module "stripe" {
  interface StripeCheckoutSessions {
    create(params: unknown): Promise<{
      id: string;
      url?: string | null;
      payment_intent?: string | null;
      [k: string]: unknown;
    }>;
  }

  interface StripeWebhooks {
    constructEvent(
      body: string | Buffer,
      signature: string,
      secret: string
    ): unknown; // Caller narrows
  }

  export default class Stripe {
    constructor(secretKey: string, options?: { apiVersion?: string });
    webhooks: StripeWebhooks;
    checkout: { sessions: StripeCheckoutSessions };
  }
}
