import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { revalidateTag } from "next/cache";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

describe("/api/revalidate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.REVALIDATE_SECRET = "test-revalidate-secret-12345678";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Helper to create a mock request
  function createMockRequest(options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Request {
    const { method = "POST", headers = {}, body } = options;
    return new Request("http://localhost/api/revalidate", {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe("Authentication", () => {
    it("returns 401 when x-revalidate-secret header is missing", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when x-revalidate-secret header is invalid", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "wrong-secret" },
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when REVALIDATE_SECRET env is not set", async () => {
      delete process.env.REVALIDATE_SECRET;

      // Re-import to pick up env change
      vi.resetModules();
      const { POST } = await import(
        "../app/api/revalidate/route"
      );

      const request = createMockRequest({
        headers: { "x-revalidate-secret": "any-secret" },
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Request Validation", () => {
    it("returns 400 when body is invalid JSON", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = new Request("http://localhost/api/revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": "test-revalidate-secret-12345678",
        },
        body: "invalid-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("returns 400 when tags field is missing", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid or missing tags");
    });

    it("returns 400 when tags is empty array", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: [] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid or missing tags");
    });

    it("returns 400 when tags contains non-whitelisted tag", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places", "events"] }, // events is not allowed
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid or missing tags");
      expect(data.error).toContain("Allowed tags:");
    });

    it("returns 400 when tags contains unknown tag", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["unknown-tag"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid or missing tags");
    });
  });

  describe("Successful Revalidation", () => {
    it("revalidates a single valid tag", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revalidated).toBe(true);
      expect(data.tags).toEqual(["places"]);
      expect(data.timestamp).toBeDefined();
      expect(revalidateTag).toHaveBeenCalledWith("places");
    });

    it("revalidates multiple valid tags", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places", "regions", "cities"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revalidated).toBe(true);
      expect(data.tags).toEqual(["places", "regions", "cities"]);
      expect(revalidateTag).toHaveBeenCalledTimes(3);
      expect(revalidateTag).toHaveBeenCalledWith("places");
      expect(revalidateTag).toHaveBeenCalledWith("regions");
      expect(revalidateTag).toHaveBeenCalledWith("cities");
    });

    it("accepts all allowed tags", async () => {
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const allowedTags = [
        "places",
        "regions",
        "regions:options",
        "cities",
        "categories",
      ];

      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: allowedTags },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revalidated).toBe(true);
      expect(data.tags).toEqual(allowedTags);
    });
  });

  describe("HTTP Method Restrictions", () => {
    it("returns 405 for GET requests", async () => {
      const { GET } = await import(
        "../app/api/revalidate/route"
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });

    it("returns 405 for PUT requests", async () => {
      const { PUT } = await import(
        "../app/api/revalidate/route"
      );

      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });

    it("returns 405 for DELETE requests", async () => {
      const { DELETE } = await import(
        "../app/api/revalidate/route"
      );

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });
  });

  describe("Cloudflare Integration", () => {
    it("skips Cloudflare purge when not configured", async () => {
      // Ensure Cloudflare env vars are not set
      delete process.env.CLOUDFLARE_ZONE_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;

      // Mock fetch to verify it's NOT called for Cloudflare
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cloudflare).toBeDefined();
      // When CF is not configured, purge is skipped but prefixes are still returned
      expect(data.cloudflare.prefixes).toContain("/api/places");
      expect(data.cloudflare.purged).toBe(false);
      expect(data.cloudflare.skipped).toBe(true);
      // The Cloudflare API should NOT have been called
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining("api.cloudflare.com"),
        expect.anything()
      );

      global.fetch = originalFetch;
    });

    it("attempts Cloudflare purge when configured", async () => {
      process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
      process.env.CLOUDFLARE_API_TOKEN = "test-api-token";

      // Mock global fetch for Cloudflare API call
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places", "regions"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cloudflare.purged).toBe(true);
      expect(data.cloudflare.prefixes).toContain("/api/places");
      expect(data.cloudflare.prefixes).toContain("/api/regions");

      // Verify Cloudflare API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.cloudflare.com"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-token",
          }),
        })
      );

      global.fetch = originalFetch;
    });

    it("handles Cloudflare API errors gracefully", async () => {
      process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
      process.env.CLOUDFLARE_API_TOKEN = "test-api-token";

      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ errors: ["Forbidden"] }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { POST } = await import(
        "../app/api/revalidate/route"
      );
      const request = createMockRequest({
        headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed overall (Next.js cache was revalidated)
      expect(response.status).toBe(200);
      expect(data.revalidated).toBe(true);
      // But Cloudflare should report failure
      expect(data.cloudflare.purged).toBe(false);
      expect(data.cloudflare.error).toBeDefined();

      global.fetch = originalFetch;
    });
  });
});

