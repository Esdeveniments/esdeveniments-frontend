/**
 * Shared Stripe API utilities for server-side operations.
 * Provides low-level helpers for making authenticated Stripe API calls.
 *
 * @see /strategy-pricing.md for sponsor system documentation
 */

export const STRIPE_API_VERSION = "2025-03-31.basil";
const STRIPE_API_BASE = "https://api.stripe.com/v1";
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Get Stripe secret key from environment.
 * Throws if not configured (fail-fast for server-side operations).
 */
function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return key;
}

/**
 * Make an authenticated request to the Stripe API with timeout protection.
 *
 * @param path - API path (e.g., "/payment_intents/pi_xxx")
 * @param options - Fetch options (method, body, headers, etc.)
 * @param timeoutMs - Request timeout in milliseconds (default: 10s)
 * @returns Response object
 * @throws Error if request fails or times out
 */
export async function stripeRequest(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
    headers?: Record<string, string>;
  } = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const { method = "GET", body, headers: customHeaders } = options;
  const secretKey = getStripeSecretKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${STRIPE_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        ...(body && { "Content-Type": "application/x-www-form-urlencoded" }),
        "Stripe-Version": STRIPE_API_VERSION,
        ...customHeaders,
      },
      ...(body && { body: body.toString() }),
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Build URLSearchParams for metadata updates.
 * Stripe expects metadata in the format: metadata[key]=value
 */
export function buildMetadataParams(
  metadata: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      params.append(`metadata[${key}]`, value);
    }
  }
  return params;
}

/**
 * Update metadata on a Stripe Payment Intent.
 * Used to copy custom fields or image URLs to the payment for Dashboard visibility.
 *
 * @param paymentIntentId - The payment intent ID (pi_xxx)
 * @param metadata - Key-value pairs to set on the payment intent
 * @returns true if successful, false otherwise
 */
export async function updatePaymentIntentMetadata(
  paymentIntentId: string,
  metadata: Record<string, string>
): Promise<boolean> {
  try {
    const params = buildMetadataParams(metadata);
    const response = await stripeRequest(
      `/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      { method: "POST", body: params }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to update payment intent metadata:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating payment intent metadata:", error);
    return false;
  }
}

/**
 * Update metadata on a Stripe Checkout Session.
 *
 * @param sessionId - The checkout session ID (cs_xxx)
 * @param metadata - Key-value pairs to set on the session
 * @returns true if successful, false otherwise
 */
export async function updateCheckoutSessionMetadata(
  sessionId: string,
  metadata: Record<string, string>
): Promise<boolean> {
  try {
    const params = buildMetadataParams(metadata);
    const response = await stripeRequest(
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { method: "POST", body: params }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Stripe session update error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating checkout session metadata:", error);
    return false;
  }
}

/**
 * Fetch a Stripe Checkout Session by ID.
 *
 * @param sessionId - The checkout session ID (cs_xxx)
 * @returns The session object (unknown type - caller should validate)
 * @throws Error if fetch fails
 */
export async function fetchCheckoutSession(
  sessionId: string
): Promise<unknown> {
  const response = await stripeRequest(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Stripe session fetch error:", body);
    throw new Error(`Stripe session fetch failed: ${response.status}`);
  }

  return (await response.json()) as unknown;
}
