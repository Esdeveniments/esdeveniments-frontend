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
import { z } from "zod";
import type {
  StripeWebhookEvent,
  VerifySignatureOptions,
  SignatureVerificationResult,
} from "types/sponsor";

/** Default tolerance for timestamp validation (5 minutes) */
const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Zod schema for runtime validation of Stripe webhook events.
 * Validates the minimal structure required for processing.
 */
const StripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

/**
 * Parse Stripe signature header into its components.
 * Handles values containing `=` by only splitting on the first `=`.
 */
export function parseSignatureHeader(
  signature: string
): Record<string, string> {
  const signatureMap: Record<string, string> = {};

  for (const element of signature.split(",")) {
    const eqIndex = element.indexOf("=");
    if (eqIndex > 0) {
      const key = element.slice(0, eqIndex);
      const value = element.slice(eqIndex + 1);
      if (value) {
        signatureMap[key] = value;
      }
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
  return crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

/**
 * Constant-time comparison of two signatures.
 * Pads shorter string to avoid leaking length information via timing.
 */
export function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  // Use the longer length to prevent length-based timing leaks
  const maxLength = Math.max(aBuffer.length, bBuffer.length);

  // Pad buffers to equal length (padding with zeros)
  const aPadded = Buffer.alloc(maxLength);
  const bPadded = Buffer.alloc(maxLength);
  aBuffer.copy(aPadded);
  bBuffer.copy(bPadded);

  // Constant-time comparison, then check lengths match
  const signaturesEqual = crypto.timingSafeEqual(aPadded, bPadded);
  const lengthsEqual = aBuffer.length === bBuffer.length;

  return signaturesEqual && lengthsEqual;
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
    return {
      valid: false,
      error: "Signature mismatch",
      timestamp: timestampNum,
    };
  }

  return { valid: true, timestamp: timestampNum };
}

/**
 * Verify and parse Stripe webhook event with runtime validation.
 *
 * @param payload - Raw request body as string
 * @param signature - Value of stripe-signature header
 * @param secret - Webhook signing secret
 * @param options - Optional configuration
 * @returns Parsed and validated event if valid, throws on invalid signature or payload
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

  // Parse and validate JSON structure
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Webhook payload is not valid JSON");
  }

  const validation = StripeWebhookEventSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(
      `Webhook payload validation failed: ${validation.error.message}`
    );
  }

  // Cast is safe after Zod validation
  return parsed as StripeWebhookEvent;
}
