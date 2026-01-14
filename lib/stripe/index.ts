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
