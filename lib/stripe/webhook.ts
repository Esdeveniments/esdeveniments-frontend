/**
 * Stripe webhook signature verification utilities.
 *
 * Implements Stripe's v1 signature scheme:
 * @see https://stripe.com/docs/webhooks/signatures
 *
 * Algorithm:
 * 1. Parse stripe-signature header for timestamp (t) and signature (v1)
 * 2. Validate timestamp is within 5 minutes (replay attack prevention)
 * 3. Compute HMAC-SHA256 of "{timestamp}.{payload}" using webhook secret
 * 4. Compare computed signature with provided v1 signature (constant-time)
 */
import crypto from "crypto";
import type { StripeWebhookEvent } from "types/sponsor";

/** Default tolerance for timestamp validation (5 minutes) */
const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

export interface VerifySignatureOptions {
  /** Tolerance in seconds for timestamp validation. Default: 300 (5 min) */
  toleranceSeconds?: number;
  /** Current timestamp for testing. Default: Date.now() / 1000 */
  currentTimestamp?: number;
}

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Parse Stripe signature header into its components
 */
export function parseSignatureHeader(
  signature: string
): Record<string, string> {
  const signatureMap: Record<string, string> = {};

  for (const element of signature.split(",")) {
    const [key, value] = element.split("=");
    if (key && value) {
      signatureMap[key] = value;
    }
  }

  return signatureMap;
}

/**
 * Compute expected HMAC-SHA256 signature for Stripe webhook
 */
export function computeSignature(
  payload: string,
  timestamp: number,
  secret: string
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
}

/**
 * Constant-time comparison of two signatures
 */
export function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Verify Stripe webhook signature
 *
 * @param payload - Raw request body as string
 * @param signature - Value of stripe-signature header
 * @param secret - Webhook signing secret from Stripe Dashboard
 * @param options - Optional configuration for timestamp tolerance
 * @returns Verification result with validity and optional error message
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
  options: VerifySignatureOptions = {}
): SignatureVerificationResult {
  const {
    toleranceSeconds = DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
    currentTimestamp = Math.floor(Date.now() / 1000),
  } = options;

  const signatureMap = parseSignatureHeader(signature);
  const timestamp = signatureMap["t"];
  const v1Signature = signatureMap["v1"];

  if (!timestamp) {
    return { valid: false, error: "Missing timestamp in signature" };
  }

  if (!v1Signature) {
    return { valid: false, error: "Missing v1 signature" };
  }

  const timestampNum = parseInt(timestamp, 10);

  if (isNaN(timestampNum)) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  // Check timestamp to prevent replay attacks
  const timeDiff = Math.abs(currentTimestamp - timestampNum);
  if (timeDiff > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp outside tolerance: ${timeDiff}s > ${toleranceSeconds}s`,
      timestamp: timestampNum,
    };
  }

  // Compute and compare signature
  const expectedSignature = computeSignature(payload, timestampNum, secret);

  if (!secureCompare(v1Signature, expectedSignature)) {
    return { valid: false, error: "Signature mismatch", timestamp: timestampNum };
  }

  return { valid: true, timestamp: timestampNum };
}

/**
 * Verify and parse Stripe webhook event
 *
 * @param payload - Raw request body as string
 * @param signature - Value of stripe-signature header
 * @param secret - Webhook signing secret
 * @param options - Optional configuration
 * @returns Parsed event if valid, throws on invalid signature
 */
export function constructEvent(
  payload: string,
  signature: string,
  secret: string,
  options?: VerifySignatureOptions
): StripeWebhookEvent {
  const result = verifyStripeSignature(payload, signature, secret, options);

  if (!result.valid) {
    throw new Error(`Webhook signature verification failed: ${result.error}`);
  }

  return JSON.parse(payload) as StripeWebhookEvent;
}
