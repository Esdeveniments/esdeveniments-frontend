import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { submitEventsToIndexNow } from "@lib/seo/indexnow";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

vi.mock("@lib/seo/indexnow", () => ({ submitEventsToIndexNow: vi.fn() }));

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
      const { POST } = await import("../app/api/revalidate/route");
      const request = createMockRequest({
        body: { tags: ["places"] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when x-revalidate-secret header is invalid", async () => {
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");

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
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");
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
      const { POST } = await import("../app/api/revalidate/route");
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
      expect(revalidateTag).toHaveBeenCalledWith("places", { expire: 0 });
    });

    it("revalidates multiple valid tags", async () => {
      const { POST } = await import("../app/api/revalidate/route");
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
      expect(revalidateTag).toHaveBeenCalledWith("places", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("regions", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("cities", { expire: 0 });
    });

    it("accepts all allowed tags", async () => {
      const { POST } = await import("../app/api/revalidate/route");
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
      const { GET } = await import("../app/api/revalidate/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });

    it("returns 405 for PUT requests", async () => {
      const { PUT } = await import("../app/api/revalidate/route");

      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });

    it("returns 405 for DELETE requests", async () => {
      const { DELETE } = await import("../app/api/revalidate/route");

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe("Method not allowed. Use POST.");
    });
  });

  describe("Cloudflare Integration", () => {
    const HTML_TAG = "www.esdeveniments.cat:html";
    const originalFetch = global.fetch;

    function cloudflareResponse(status: number, body: unknown): Response {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }

    async function revalidate(tags: string[]) {
      vi.resetModules();
      const { POST } = await import("../app/api/revalidate/route");
      const response = await POST(
        createMockRequest({
          headers: { "x-revalidate-secret": "test-revalidate-secret-12345678" },
          body: { tags },
        })
      );
      return { status: response.status, data: await response.json() };
    }

    function purgeBodies(mockFetch: ReturnType<typeof vi.fn>): unknown[] {
      return mockFetch.mock.calls.map(([, init]) => JSON.parse(init.body));
    }

    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("skips Cloudflare purge when not configured", async () => {
      delete process.env.CLOUDFLARE_ZONE_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { status, data } = await revalidate(["places"]);

      expect(status).toBe(200);
      expect(data.cloudflare).toEqual({ purged: false, tags: [HTML_TAG], skipped: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("purges all HTML by Cache-Tag for structural tags", async () => {
      process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
      process.env.CLOUDFLARE_API_TOKEN = "test-api-token";
      const mockFetch = vi.fn(async () =>
        cloudflareResponse(200, { success: true, errors: [], result: { id: "x" } })
      );
      global.fetch = mockFetch;

      const { status, data } = await revalidate(["places", "regions"]);

      expect(status).toBe(200);
      expect(data.cloudflare).toEqual({ purged: true, tags: [HTML_TAG] });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.cloudflare.com/client/v4/zones/test-zone-id/purge_cache",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-token",
          }),
        })
      );
      expect(purgeBodies(mockFetch)).toEqual([{ tags: [HTML_TAG] }]);
    });

    it("falls back to purging everything when the tag purge fails", async () => {
      process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
      process.env.CLOUDFLARE_API_TOKEN = "test-api-token";
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(cloudflareResponse(500, { success: false }))
        .mockResolvedValueOnce(cloudflareResponse(200, { success: true, errors: [] }));
      global.fetch = mockFetch;

      const { data } = await revalidate(["categories"]);

      expect(purgeBodies(mockFetch)).toEqual([
        { tags: [HTML_TAG] },
        { purge_everything: true },
      ]);
      expect(data.cloudflare).toEqual({ purged: true, prefixes: ["*"] });
    });

    it("reports a Cloudflare failure without failing the revalidation", async () => {
      process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
      process.env.CLOUDFLARE_API_TOKEN = "test-api-token";
      global.fetch = vi.fn(async () =>
        cloudflareResponse(403, { success: false, errors: [{ code: 10000, message: "Authentication error" }] })
      );

      const { status, data } = await revalidate(["places"]);

      expect(status).toBe(200);
      expect(data.revalidated).toBe(true);
      expect(data.cloudflare.purged).toBe(false);
      expect(data.cloudflare.error).toBe("Cloudflare purge failed: 403");
    });
  });

  describe("Event revalidation", () => {
    const secretHeader = { "x-revalidate-secret": "test-revalidate-secret-12345678" };
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it.each([[[]], [[{ city: { slug: "girona" } }]], ["my-event"]])(
      "returns 400 for invalid events %j",
      async (events) => {
        const { POST } = await import("../app/api/revalidate/route");
        const response = await POST(
          createMockRequest({ headers: secretHeader, body: { events } })
        );

        expect(response.status).toBe(400);
        expect(revalidateTag).not.toHaveBeenCalled();
      }
    );

    it("expires the events, then purges their pages from Cloudflare", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
      process.env.CLOUDFLARE_ZONE_ID = "zone";
      process.env.CLOUDFLARE_API_TOKEN = "token";
      const mockFetch = vi.fn(async () =>
        new Response(JSON.stringify({ success: true, errors: [] }))
      );
      global.fetch = mockFetch as unknown as typeof fetch;
      vi.resetModules();
      const { POST } = await import("../app/api/revalidate/route");

      const response = await POST(
        createMockRequest({
          headers: secretHeader,
          body: {
            events: [
              { slug: "old-title", city: { slug: "girona" }, owner: { username: "anna" } },
              { slug: "new-title", city: { slug: "salt" } },
            ],
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toEqual(["old-title", "new-title"]);
      expect(revalidateTag).toHaveBeenCalledWith("event:old-title", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("event:new-title", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("events", { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith("/ca/e/new-title");
      expect(mockFetch).not.toHaveBeenCalled();

      const task = vi.mocked(after).mock.calls[0][0] as () => Promise<void>;
      await task();
      const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const purged = JSON.parse(String(init.body)).tags;
      expect(purged).toEqual(
        expect.arrayContaining([
          "www.esdeveniments.cat:event:old-title",
          "www.esdeveniments.cat:event:new-title",
          "www.esdeveniments.cat:place:girona",
          "www.esdeveniments.cat:place:salt",
          "www.esdeveniments.cat:user:anna",
        ])
      );
      expect(submitEventsToIndexNow).toHaveBeenCalledWith(["old-title", "new-title"]);
    });
  });
});
