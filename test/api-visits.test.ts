import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { POST } from "app/api/visits/route";

// Mock server-side HMAC fetch to avoid real network
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn().mockResolvedValue({ ok: true, status: 204 }),
}));

// Mock next/server's after() function which requires request context
vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  return {
    ...original,
    after: vi.fn((fn: () => void | Promise<void>) => {
      // Execute the callback immediately in tests (no request context needed)
      fn();
    }),
  };
});

import { fetchWithHmac } from "@lib/api/fetch-wrapper";

const originalEnv = { ...process.env };

describe("/api/visits", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    (fetchWithHmac as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 204 and no-ops when VISITS_ENDPOINT is not set", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.VISITS_ENDPOINT;

    const req = new Request("http://localhost/api/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId: "abc-123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(fetchWithHmac).not.toHaveBeenCalled();
  });

  it("forwards to backend with HMAC and x-visitor-id when configured", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    process.env.VISITS_ENDPOINT = "/visits";

    const req = new Request("http://localhost/api/visits", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-visitor-id": "abc123",
      },
      body: JSON.stringify({ eventId: 42, slug: "some-slug" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(fetchWithHmac).toHaveBeenCalledTimes(1);
    const [url, options] = (fetchWithHmac as any).mock.calls[0];
    expect(url).toBe("https://api.example.com/visits");
    expect(options.method).toBe("POST");
    // headers is a plain object (HeadersInit), not a Headers instance
    const headerMap = options.headers as Record<string, string>;
    expect(headerMap["x-visitor-id"]).toBe("abc123");
    expect(headerMap["Content-Type"]).toBe("application/json");
    expect(headerMap["Accept"]).toBe("application/json");
    expect(typeof options.body).toBe("string");
  });
});
