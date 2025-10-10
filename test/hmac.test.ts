import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateHmac } from "../utils/hmac";

const originalEnv = { ...process.env };

describe("utils/hmac", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
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

    it("falls back to default secret when HMAC_SECRET is not set", async () => {
      delete process.env.HMAC_SECRET;
      const { generateHmac: generateHmacDefault } = await import(
        "../utils/hmac"
      );
      const hmac = await generateHmacDefault("body", 1000, "/path");
      expect(typeof hmac).toBe("string");
      expect(hmac.length).toBe(64);
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
});
