/**
 * Stripe utilities for server-side operations.
 * @see /strategy-pricing.md for sponsor system documentation
 */

export {
  stripeRequest,
  buildMetadataParams,
  updatePaymentIntentMetadata,
  updateCheckoutSessionMetadata,
  fetchCheckoutSession,
} from "./api";

export {
  verifyStripeSignature,
  constructEvent,
  parseSignatureHeader,
  computeSignature,
  secureCompare,
} from "./webhook";

export type {
  VerifySignatureOptions,
  SignatureVerificationResult,
} from "types/sponsor";
