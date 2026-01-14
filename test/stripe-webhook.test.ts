/**
 * Tests for Stripe webhook signature verification
 *
 * These tests validate our implementation against Stripe's documented algorithm:
 * @see https://stripe.com/docs/webhooks/signatures
 */
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  parseSignatureHeader,
  computeSignature,
  secureCompare,
  verifyStripeSignature,
  constructEvent,
} from "@lib/stripe/webhook";

// Test constants
const TEST_SECRET = "whsec_test_secret_key_1234567890";
const TEST_PAYLOAD = JSON.stringify({
  id: "evt_test_123",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_123" } },
});

/**
 * Generate a valid Stripe signature for testing
 */
function generateTestSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe Webhook Signature Verification", () => {
  describe("parseSignatureHeader", () => {
    it("parses valid signature header", () => {
      const header = "t=1234567890,v1=abc123,v0=def456";
      const result = parseSignatureHeader(header);

      expect(result).toEqual({
        t: "1234567890",
        v1: "abc123",
        v0: "def456",
      });
    });

    it("handles header with only t and v1", () => {
      const header = "t=1234567890,v1=abc123";
      const result = parseSignatureHeader(header);

      expect(result).toEqual({
        t: "1234567890",
        v1: "abc123",
      });
    });

    it("handles empty string", () => {
      const result = parseSignatureHeader("");
      expect(result).toEqual({});
    });

    it("handles malformed elements", () => {
      const header = "t=123,invalid,v1=abc";
      const result = parseSignatureHeader(header);

      expect(result).toEqual({
        t: "123",
        v1: "abc",
      });
    });
  });

  describe("computeSignature", () => {
    it("computes correct HMAC-SHA256 signature", () => {
      const payload = "test payload";
      const timestamp = 1234567890;
      const secret = "test_secret";

      const result = computeSignature(payload, timestamp, secret);

      // Verify by computing manually
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");

      expect(result).toBe(expected);
    });

    it("produces different signatures for different timestamps", () => {
      const payload = "test payload";
      const secret = "test_secret";

      const sig1 = computeSignature(payload, 1000, secret);
      const sig2 = computeSignature(payload, 2000, secret);

      expect(sig1).not.toBe(sig2);
    });

    it("produces different signatures for different secrets", () => {
      const payload = "test payload";
      const timestamp = 1234567890;

      const sig1 = computeSignature(payload, timestamp, "secret1");
      const sig2 = computeSignature(payload, timestamp, "secret2");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("secureCompare", () => {
    it("returns true for identical strings", () => {
      expect(secureCompare("abc123", "abc123")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(secureCompare("abc123", "abc124")).toBe(false);
    });

    it("returns false for different lengths", () => {
      expect(secureCompare("abc", "abcd")).toBe(false);
    });

    it("returns true for empty strings", () => {
      expect(secureCompare("", "")).toBe(true);
    });
  });

  describe("verifyStripeSignature", () => {
    it("validates correct signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        timestamp
      );

      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        TEST_SECRET
      );

      expect(result.valid).toBe(true);
      expect(result.timestamp).toBe(timestamp);
      expect(result.error).toBeUndefined();
    });

    it("rejects missing timestamp", () => {
      const signature = "v1=abc123";
      const result = verifyStripeSignature(TEST_PAYLOAD, signature, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing timestamp in signature");
    });

    it("rejects missing v1 signature", () => {
      const signature = "t=1234567890";
      const result = verifyStripeSignature(TEST_PAYLOAD, signature, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing v1 signature");
    });

    it("rejects invalid timestamp format", () => {
      const signature = "t=invalid,v1=abc123";
      const result = verifyStripeSignature(TEST_PAYLOAD, signature, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid timestamp format");
    });

    it("rejects expired timestamp (too old)", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        oldTimestamp
      );

      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        TEST_SECRET
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Timestamp outside tolerance");
    });

    it("rejects future timestamp (too far ahead)", () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400 seconds in future
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        futureTimestamp
      );

      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        TEST_SECRET
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Timestamp outside tolerance");
    });

    it("accepts timestamp within custom tolerance", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 500;
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        oldTimestamp
      );

      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        TEST_SECRET,
        { toleranceSeconds: 600 }
      );

      expect(result.valid).toBe(true);
    });

    it("rejects wrong secret", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        timestamp
      );

      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        "wrong_secret"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("rejects tampered payload", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        timestamp
      );

      const tamperedPayload = JSON.stringify({ tampered: true });
      const result = verifyStripeSignature(
        tamperedPayload,
        signature,
        TEST_SECRET
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("allows custom current timestamp for testing", () => {
      const eventTimestamp = 1700000000;
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        eventTimestamp
      );

      // Without custom timestamp, this would fail (too old)
      const result = verifyStripeSignature(
        TEST_PAYLOAD,
        signature,
        TEST_SECRET,
        { currentTimestamp: eventTimestamp + 100 }
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("constructEvent", () => {
    it("returns parsed event for valid signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateTestSignature(
        TEST_PAYLOAD,
        TEST_SECRET,
        timestamp
      );

      const event = constructEvent(TEST_PAYLOAD, signature, TEST_SECRET);

      expect(event.id).toBe("evt_test_123");
      expect(event.type).toBe("checkout.session.completed");
    });

    it("throws on invalid signature", () => {
      const signature = "t=1234567890,v1=invalid";

      expect(() =>
        constructEvent(TEST_PAYLOAD, signature, TEST_SECRET)
      ).toThrow("Webhook signature verification failed");
    });

    it("throws on invalid JSON", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidPayload = "not json";
      const signature = generateTestSignature(
        invalidPayload,
        TEST_SECRET,
        timestamp
      );

      expect(() =>
        constructEvent(invalidPayload, signature, TEST_SECRET)
      ).toThrow();
    });
  });
});
