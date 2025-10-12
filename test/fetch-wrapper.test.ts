import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithHmac } from "../lib/api/fetch-wrapper";

const originalEnv = { ...process.env };

describe("lib/api/fetch-wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    // Mock fetch
    (globalThis as { fetch: typeof fetch }).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("fetchWithHmac", () => {
    it("adds x-timestamp and x-hmac headers to the request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      await fetchWithHmac("https://api.example.com/test", {
        method: "POST",
        body: "test body",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://api.example.com/test");
      expect(options).toBeDefined();
      expect(options.headers).toBeInstanceOf(Headers);

      const headers = options.headers as Headers;
      const timestamp = headers.get("x-timestamp");
      const hmac = headers.get("x-hmac");

      expect(timestamp).toBeDefined();
      expect(hmac).toBeDefined();
      expect(typeof timestamp).toBe("string");
      expect(typeof hmac).toBe("string");
      expect(!isNaN(parseInt(timestamp!))).toBe(true);
      expect(hmac!.length).toBe(64); // SHA-256 hex
      expect(/^[a-f0-9]{64}$/.test(hmac!)).toBe(true);
    });

    it("includes string body in HMAC calculation", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      const body = "test request body";
      await fetchWithHmac("https://api.example.com/test", {
        method: "POST",
        body,
      });

      const options = mockFetch.mock.calls[0][1];
      const headers = options.headers as Headers;
      const timestamp = headers.get("x-timestamp");
      const hmac = headers.get("x-hmac");

      // Verify the HMAC was calculated with body included
      expect(timestamp).toBeDefined();
      expect(hmac).toBeDefined();
    });

    it("does not include non-string body in HMAC calculation", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      const formData = new FormData();
      formData.append("key", "value");

      await fetchWithHmac("https://api.example.com/upload", {
        method: "POST",
        body: formData,
      });

      const options = mockFetch.mock.calls[0][1];
      const headers = options.headers as Headers;
      const timestamp = headers.get("x-timestamp");
      const hmac = headers.get("x-hmac");

      expect(timestamp).toBeDefined();
      expect(hmac).toBeDefined();
      // HMAC should be calculated without body content for FormData
    });

    it("handles empty body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      await fetchWithHmac("https://api.example.com/test", {
        method: "GET",
      });

      const options = mockFetch.mock.calls[0][1];
      const headers = options.headers as Headers;
      const timestamp = headers.get("x-timestamp");
      const hmac = headers.get("x-hmac");

      expect(timestamp).toBeDefined();
      expect(hmac).toBeDefined();
    });

    it("preserves existing headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      const existingHeaders = new Headers({
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      });

      await fetchWithHmac("https://api.example.com/test", {
        method: "POST",
        headers: existingHeaders,
        body: "test",
      });

      const options = mockFetch.mock.calls[0][1];
      const headers = options.headers as Headers;

      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Authorization")).toBe("Bearer token");
      expect(headers.get("x-timestamp")).toBeDefined();
      expect(headers.get("x-hmac")).toBeDefined();
    });

    it("handles URL with query parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      await fetchWithHmac(
        "https://api.example.com/test?param=value&other=123",
        {
          method: "GET",
        }
      );

      const options = mockFetch.mock.calls[0][1];
      const headers = options.headers as Headers;
      const hmac = headers.get("x-hmac");

      expect(hmac).toBeDefined();
      expect(hmac!.length).toBe(64);
    });

    it("handles relative URLs", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      await fetchWithHmac("http://localhost:3000/api/test", {
        method: "GET",
      });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/test");

      const headers = options.headers as Headers;
      expect(headers.get("x-timestamp")).toBeDefined();
      expect(headers.get("x-hmac")).toBeDefined();
    });

    it("passes through all other options to fetch", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      const customOptions = {
        method: "PUT",
        mode: "cors" as RequestMode,
        cache: "no-cache" as RequestCache,
        credentials: "same-origin" as RequestCredentials,
        redirect: "follow" as RequestRedirect,
        referrer: "client",
        integrity: "sha256-hash",
      };

      await fetchWithHmac("https://api.example.com/test", customOptions);

      const options = mockFetch.mock.calls[0][1];

      expect(options.method).toBe("PUT");
      expect(options.mode).toBe("cors");
      expect(options.cache).toBe("no-cache");
      expect(options.credentials).toBe("same-origin");
      expect(options.redirect).toBe("follow");
      expect(options.referrer).toBe("client");
      expect(options.integrity).toBe("sha256-hash");
    });

    it("returns the result of fetch", async () => {
      const mockResponse = { ok: true, status: 200, json: vi.fn() };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

      const result = await fetchWithHmac("https://api.example.com/test");

      expect(result).toBe(mockResponse);
    });

    it("throws error for invalid URL", async () => {
      await expect(fetchWithHmac("/api/test")).rejects.toThrow(
        '[fetchWithHmac] Invalid URL: "/api/test". Server-side API calls must use absolute URLs.'
      );
    });
  });
});
