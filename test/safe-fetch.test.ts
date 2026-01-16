import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeFetch, fireAndForgetFetch } from "../utils/safe-fetch";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { captureException } from "@sentry/nextjs";

describe("utils/safe-fetch", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    vi.mocked(captureException).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("safeFetch", () => {
    it("returns data on successful JSON response", async () => {
      const mockData = { success: true, value: 42 };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue(mockData),
      });

      const result = await safeFetch<typeof mockData>(
        "https://example.com/api"
      );

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(result.status).toBe(200);
      expect(captureException).not.toHaveBeenCalled();
    });

    it("returns error for non-JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: vi.fn().mockResolvedValue("plain text response"),
      });

      const result = await safeFetch<string>("https://example.com/api");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain(
        "Expected a JSON response but received content-type 'text/plain'"
      );
      expect(result.status).toBe(200);
      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ host: "example.com" }),
          extra: expect.objectContaining({
            status: 200,
            url: "https://example.com/api",
            responseBody: "plain text response",
          }),
        })
      );
    });

    it("returns error on non-OK response and logs to Sentry", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('{"error": "Database connection failed"}'),
      });

      const result = await safeFetch("https://example.com/api", {
        context: { tags: { action: "test" }, extra: { foo: "bar" } },
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe(
        "Fetch failed: 500 Internal Server Error"
      );
      expect(result.status).toBe(500);
      expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
        tags: { action: "test", host: "example.com" },
        extra: {
          foo: "bar",
          status: 500,
          url: "https://example.com/api",
          responseBody: '{"error": "Database connection failed"}',
        },
      });
    });

    it("returns error on 404 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        text: vi.fn().mockResolvedValue("Resource not found"),
      });

      const result = await safeFetch("https://example.com/missing");

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Fetch failed: 404 Not Found");
      expect(result.status).toBe(404);
    });

    it("handles network errors gracefully", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValue(networkError);

      const result = await safeFetch("https://example.com/api");

      expect(result.data).toBeNull();
      expect(result.error).toBe(networkError);
      expect(result.status).toBeNull();
      expect(captureException).toHaveBeenCalledWith(networkError, {
        tags: { host: "example.com" },
        extra: { url: "https://example.com/api", timeout: 5000 },
      });
    });

    it("handles invalid URLs gracefully without throwing", async () => {
      const networkError = new Error("Invalid URL");
      mockFetch.mockRejectedValue(networkError);

      // Should not throw even with invalid URL
      const result = await safeFetch("not-a-valid-url");

      expect(result.data).toBeNull();
      expect(result.error).toBe(networkError);
      expect(captureException).toHaveBeenCalledWith(networkError, {
        tags: { host: "unknown" },
        extra: { url: "invalid-url", timeout: 5000 },
      });
    });

    it("aborts request after timeout", async () => {
      // Create a fetch that never resolves until aborted
      mockFetch.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = safeFetch("https://example.com/slow", {
        timeout: 1000,
      });

      // Advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(1000);

      const result = await fetchPromise;

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Request timeout after 1000ms");
      expect(result.error?.cause).toBeInstanceOf(Error);
      expect((result.error?.cause as Error).name).toBe("AbortError");
      expect(result.status).toBeNull();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Request timeout after 1000ms",
        }),
        expect.objectContaining({
          tags: expect.objectContaining({ host: "example.com" }),
          extra: expect.objectContaining({
            url: "https://example.com/slow",
            timeout: 1000,
          }),
        })
      );
    });

    it("uses custom timeout when provided", async () => {
      mockFetch.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = safeFetch("https://example.com/slow", {
        timeout: 500,
      });

      // Should not abort at 400ms
      await vi.advanceTimersByTimeAsync(400);
      // Should abort at 500ms
      await vi.advanceTimersByTimeAsync(100);

      const result = await fetchPromise;
      expect(result.error?.message).toBe("Request timeout after 500ms");
    });

    it("passes through fetch options", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({}),
      });

      await safeFetch("https://example.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "value" }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "value" }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("clears timeout on successful response", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({}),
      });

      await safeFetch("https://example.com/api");

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("handles 204 No Content responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await safeFetch("https://example.com/webhook");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.status).toBe(204);
      expect(captureException).not.toHaveBeenCalled();
    });

    it("merges external abort signal with timeout signal", async () => {
      const externalController = new AbortController();

      mockFetch.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = safeFetch("https://example.com/api", {
        signal: externalController.signal,
        timeout: 5000,
      });

      // Abort externally before timeout
      externalController.abort();

      const result = await fetchPromise;

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Request timeout after 5000ms");
      expect(result.status).toBeNull();
    });

    it("sanitizes URLs with query params in error logs", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        text: vi.fn().mockResolvedValue("Error details"),
      });

      await safeFetch("https://example.com/webhook?token=secret123&key=abc");

      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ host: "example.com" }),
          extra: expect.objectContaining({
            url: "https://example.com/webhook", // Query params stripped
          }),
        })
      );
    });
  });

  describe("fireAndForgetFetch", () => {
    it("calls safeFetch and returns void", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ sent: true }),
      });

      const result = await fireAndForgetFetch("https://example.com/webhook", {
        method: "POST",
        body: JSON.stringify({ event: "test" }),
      });

      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalled();
    });

    it("does not throw on error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await expect(
        fireAndForgetFetch("https://example.com/webhook")
      ).resolves.toBeUndefined();

      // But should log to Sentry
      expect(captureException).toHaveBeenCalled();
    });

    it("does not throw on non-OK response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers(),
      });

      await expect(
        fireAndForgetFetch("https://example.com/webhook")
      ).resolves.toBeUndefined();

      expect(captureException).toHaveBeenCalled();
    });
  });
});
