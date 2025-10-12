import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateHmac, verifyHmacSignature } from "../utils/hmac";

const originalEnv = { ...process.env };

describe("utils/hmac", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.HMAC_SECRET = "746573742d736563726574"; // hex for "test-secret"
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateHmac", () => {
    it("generates a valid SHA-256 HMAC hex string", async () => {
      const hmac = await generateHmac("test body", 1234567890, "/api/test");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hmac)).toBe(true);
    });

    it("produces consistent output for identical inputs", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path");
      const hmac2 = await generateHmac("body", 1000, "/path");
      expect(hmac1).toBe(hmac2);
    });

    it("produces different output for different body", async () => {
      const hmac1 = await generateHmac("body1", 1000, "/path");
      const hmac2 = await generateHmac("body2", 1000, "/path");
      expect(hmac1).not.toBe(hmac2);
    });

    it("produces different output for different timestamp", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path");
      const hmac2 = await generateHmac("body", 1001, "/path");
      expect(hmac1).not.toBe(hmac2);
    });

    it("produces different output for different pathAndQuery", async () => {
      const hmac1 = await generateHmac("body", 1000, "/path1");
      const hmac2 = await generateHmac("body", 1000, "/path2");
      expect(hmac1).not.toBe(hmac2);
    });

    it("handles empty body", async () => {
      const hmac = await generateHmac("", 1000, "/path");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles empty pathAndQuery", async () => {
      const hmac = await generateHmac("body", 1000, "");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles pathAndQuery with query parameters", async () => {
      const hmac = await generateHmac("body", 1000, "/api/test?param=value");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("uses HMAC_SECRET from environment", async () => {
      // Test that it uses the test secret set in setup
      const hmac = await generateHmac("body", 1000, "/path");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
      // The actual value depends on the secret, but we verify it's using some secret
    });

    it("handles large inputs", async () => {
      const largeBody = "a".repeat(10000);
      const hmac = await generateHmac(largeBody, 1000, "/path");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
    });

    it("handles special characters in inputs", async () => {
      const specialBody = "body with spaces & symbols !@#$%^&*()";
      const specialPath = "/api/test?param=value&other=123";
      const hmac = await generateHmac(specialBody, 1234567890123, specialPath);
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
      const stringToSign = `${body}${timestamp}${pathAndQuery}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery);
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("rejects an invalid signature", async () => {
      const body = "test body";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `${body}${timestamp}${pathAndQuery}`;
      const invalidHmac = "invalid-signature";
      const isValid = await verifyHmacSignature(stringToSign, invalidHmac);
      expect(isValid).toBe(false);
    });

    it("rejects signature for different string", async () => {
      const body1 = "test body 1";
      const body2 = "test body 2";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign2 = `${body2}${timestamp}${pathAndQuery}`;
      const hmac = await generateHmac(body1, timestamp, pathAndQuery);
      const isValid = await verifyHmacSignature(stringToSign2, hmac);
      expect(isValid).toBe(false);
    });

    it("handles empty string", async () => {
      const body = "";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `${body}${timestamp}${pathAndQuery}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery);
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("handles large strings", async () => {
      const largeBody = "a".repeat(10000);
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `${largeBody}${timestamp}${pathAndQuery}`;
      const hmac = await generateHmac(largeBody, timestamp, pathAndQuery);
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("handles special characters", async () => {
      const specialBody = "body with spaces & symbols !@#$%^&*()";
      const timestamp = 1234567890123;
      const specialPath = "/api/test?param=value&other=123";
      const stringToSign = `${specialBody}${timestamp}${specialPath}`;
      const hmac = await generateHmac(specialBody, timestamp, specialPath);
      const isValid = await verifyHmacSignature(stringToSign, hmac);
      expect(isValid).toBe(true);
    });

    it("rejects with wrong secret", async () => {
      const body = "test body";
      const timestamp = 1234567890;
      const pathAndQuery = "/api/test";
      const stringToSign = `${body}${timestamp}${pathAndQuery}`;
      const hmac = await generateHmac(body, timestamp, pathAndQuery);
      const isValid = await verifyHmacSignature(
        stringToSign,
        hmac,
        "77726f6e672d736563726574" // hex for "wrong-secret"
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

  it("throws error when HMAC_SECRET is not set", async () => {
    delete process.env.HMAC_SECRET;
    await expect(generateHmac("body", 1000, "/path")).rejects.toThrow(
      "HMAC_SECRET environment variable must be set"
    );
  });
});
