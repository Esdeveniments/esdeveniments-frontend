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

    it("returns text data for non-JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: vi.fn().mockResolvedValue("plain text response"),
      });

      const result = await safeFetch<string>("https://example.com/api");

      expect(result.data).toBe("plain text response");
      expect(result.error).toBeNull();
      expect(result.status).toBe(200);
    });

    it("returns error on non-OK response and logs to Sentry", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
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
        tags: { action: "test", url: "example.com" },
        extra: { foo: "bar", status: 500, url: "https://example.com/api" },
      });
    });

    it("returns error on 404 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
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
        tags: { url: "example.com" },
        extra: { url: "https://example.com/api", timeout: 5000 },
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
      expect(result.error?.name).toBe("AbortError");
      expect(result.status).toBeNull();
      expect(captureException).toHaveBeenCalled();
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
      expect(result.error?.name).toBe("AbortError");
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
