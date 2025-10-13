import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateHmac,
  verifyHmacSignature,
  validateTimestamp,
} from "../utils/hmac";

const originalEnv = { ...process.env };

describe("utils/hmac", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.HMAC_SECRET = "wrong-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateHmac", () => {
    it("generates a valid SHA-256 HMAC hex string", async () => {
      const hmac = await generateHmac(
        "test body",
        1234567890,
        "/api/test",
        "GET"
      );
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hmac)).toBe(true);
    });

    it("produces consistent output for identical inputs", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path", "GET");
      const hmac2 = await generateHmac("body", 1000, "/path", "GET");
      expect(hmac1).toBe(hmac2);
    });

    it("produces different output for different body", async () => {
      const hmac1 = await generateHmac("body1", 1000, "/path", "GET");
      const hmac2 = await generateHmac("body2", 1000, "/path", "GET");
      expect(hmac1).not.toBe(hmac2);
    });

    it("produces different output for different timestamp", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path", "GET");
      const hmac2 = await generateHmac("body", 1001, "/path", "GET");
      expect(hmac1).not.toBe(hmac2);
    });

    it("produces different output for different pathAndQuery", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path1", "GET");
      const hmac2 = await generateHmac("body", 1000, "/path2", "GET");
      expect(hmac1).not.toBe(hmac2);
    });

    it("handles empty body", async () => {
      const hmac = await generateHmac("", 1000, "/path", "GET");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles empty pathAndQuery", async () => {
      const hmac = await generateHmac("body", 1000, "", "GET");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles pathAndQuery with query parameters", async () => {
      const hmac = await generateHmac(
        "body",
        1000,
        "/api/test?param=value",
        "GET"
      );
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("uses HMAC_SECRET from environment", async () => {
      // Test that it uses the test secret set in setup
      const hmac = await generateHmac("body", 1000, "/path", "GET");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
      // The actual value depends on the secret, but we verify it's using some secret
    });

    it("handles large inputs", async () => {
      const largeBody = "a".repeat(10000);
      const hmac = await generateHmac(largeBody, 1000, "/path", "GET");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles special characters in inputs", async () => {
      const specialBody = "body with spaces & symbols !@#$%^&*()";
      const specialPath = "/api/test?param=value&other=123";
      const hmac = await generateHmac(
        specialBody,
        1234567890123,
        specialPath,
        "GET"
      );
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hmac)).toBe(true);
    });
  });

  describe("verifyHmacSignature", () => {
    it("verifies a valid signature", async () => {
      const body = "test body";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `GET|${timestamp}|${pathAndQuery}|${body}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery, "GET");
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("rejects an invalid signature", async () => {
      const body = "test body";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `GET|${timestamp}|${pathAndQuery}|${body}`;
      const invalidHmac = "invalid-signature";
      const isValid = await verifyHmacSignature(stringToSign, invalidHmac);
      expect(isValid).toBe(false);
    });

    it("rejects signature for different string", async () => {
      const body1 = "test body 1";
      const body2 = "test body 2";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign2 = `GET|${timestamp}|${pathAndQuery}|${body2}`;
      const hmac = await generateHmac(body1, timestamp, pathAndQuery, "GET");
      const isValid = await verifyHmacSignature(stringToSign2, hmac);
      expect(isValid).toBe(false);
    });

    it("handles empty string", async () => {
      const body = "";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `GET|${timestamp}|${pathAndQuery}|${body}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery, "GET");
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("handles large strings", async () => {
      const largeBody = "a".repeat(10000);
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `GET|${timestamp}|${pathAndQuery}|${largeBody}`;
      const hmac = await generateHmac(
        largeBody,
        timestamp,
        pathAndQuery,
        "GET"
      );
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("handles special characters", async () => {
      const specialBody = "body with spaces & symbols !@#$%^&*()";
      const timestamp = 1234567890123;
      const specialPath = "/api/test?param=value&other=123";
      const stringToSign = `GET|${timestamp}|${specialPath}|${specialBody}`;
      const hmac = await generateHmac(
        specialBody,
        timestamp,
        specialPath,
        "GET"
      );
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("rejects with wrong secret", async () => {
      const body = "test body";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `GET|${timestamp}|${pathAndQuery}|${body}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery, "GET");
      const isValid = await verifyHmacSignature(
        stringToSign,
        hmac,
        "wrong-secret-2"
      );
      expect(isValid).toBe(false);
    });

    it("handles invalid hex signature gracefully", async () => {
      const stringToSign = "test string";
      const invalidHexHmac =
        "gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg"; // invalid hex
      const isValid = await verifyHmacSignature(stringToSign, invalidHexHmac);
      expect(isValid).toBe(false);
    });

    it("handles malformed signature", async () => {
      const stringToSign = "test string";
      const malformedHmac = "short";
      const isValid = await verifyHmacSignature(stringToSign, malformedHmac);
      expect(isValid).toBe(false);
    });
  });

  describe("validateTimestamp", () => {
    it("returns false for invalid timestamp that parses to NaN", () => {
      expect(validateTimestamp("abc")).toBe(false);
      expect(validateTimestamp("")).toBe(false);
      expect(validateTimestamp("NaN")).toBe(false);
      expect(validateTimestamp("not-a-number")).toBe(false);
    });

    it("returns false for timestamp too far in the future beyond clock skew tolerance", () => {
      const now = 1609459200000; // Fixed timestamp for consistency
      const futureTooFar = now + 60001; // Beyond 1 minute (60000 ms)
      vi.spyOn(Date, "now").mockReturnValue(now);
      expect(validateTimestamp(futureTooFar.toString())).toBe(false);
      vi.restoreAllMocks();
    });

    it("returns false for timestamp too old beyond 5 minutes", () => {
      const now = 1609459200000; // Fixed timestamp for consistency
      const oldTooFar = now - 300001; // Beyond 5 minutes (300000 ms)
      vi.spyOn(Date, "now").mockReturnValue(now);
      expect(validateTimestamp(oldTooFar.toString())).toBe(false);
      vi.restoreAllMocks();
    });

    it("returns true for valid timestamp within tolerance", () => {
      const now = 1609459200000; // Fixed timestamp for consistency
      const validPast = now - 10000; // 10 seconds ago
      const validFuture = now + 30000; // 30 seconds in future
      vi.spyOn(Date, "now").mockReturnValue(now);
      expect(validateTimestamp(validPast.toString())).toBe(true);
      expect(validateTimestamp(validFuture.toString())).toBe(true);
      vi.restoreAllMocks();
    });

    it("returns true for timestamp exactly at future tolerance boundary", () => {
      const now = 1609459200000; // Fixed timestamp for consistency
      const atFutureBoundary = now + 60000; // Exactly 1 minute in future
      vi.spyOn(Date, "now").mockReturnValue(now);
      expect(validateTimestamp(atFutureBoundary.toString())).toBe(true);
      vi.restoreAllMocks();
    });

    it("returns true for timestamp exactly at past tolerance boundary", () => {
      const now = 1609459200000; // Fixed timestamp for consistency
      const atPastBoundary = now - 300000; // Exactly 5 minutes ago
      vi.spyOn(Date, "now").mockReturnValue(now);
      expect(validateTimestamp(atPastBoundary.toString())).toBe(true);
      vi.restoreAllMocks();
    });
  });

  it("throws error when HMAC_SECRET is not set", async () => {
    delete process.env.HMAC_SECRET;
    await expect(generateHmac("body", 1000, "/path", "GET")).rejects.toThrow(
      "HMAC_SECRET environment variable must be set"
    );
  });
});
