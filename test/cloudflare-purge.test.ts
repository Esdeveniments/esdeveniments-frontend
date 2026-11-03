import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureException } from "@sentry/nextjs";
import {
  buildPurgeBodies,
  purgeCloudflareCache,
  purgeEventPagesFromCdn,
} from "@lib/cdn/cloudflare-purge";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildPurgeBodies", () => {
  it("dedupes and splits tags into requests of at most 100", () => {
    const tags = Array.from({ length: 150 }, (_, i) => `t${i}`);

    const bodies = buildPurgeBodies({ tags: [...tags, "t0"] });

    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual({ tags: tags.slice(0, 100) });
    expect(bodies[1]).toEqual({ tags: tags.slice(100) });
  });

  it("builds the purge-everything and prefix payloads", () => {
    expect(buildPurgeBodies({ purgeEverything: true })).toEqual([{ purge_everything: true }]);
    expect(buildPurgeBodies({ prefixes: ["a.cat/x"] })).toEqual([{ prefixes: ["a.cat/x"] }]);
    expect(buildPurgeBodies({ tags: [] })).toEqual([]);
  });
});

describe("purgeCloudflareCache", () => {
  let mockFetch: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CLOUDFLARE_ZONE_ID: "zone-1",
      CLOUDFLARE_API_TOKEN: "token-1",
      NEXT_PUBLIC_SITE_URL: "https://www.esdeveniments.cat",
    };
    mockFetch = vi.fn<typeof fetch>(async () => jsonResponse(200, { success: true, errors: [], result: { id: "p" } }));
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("posts the tags to the zone purge endpoint with the API token", async () => {
    const outcome = await purgeCloudflareCache({ tags: ["a", "b"] });

    expect(outcome).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init = {}] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.cloudflare.com/client/v4/zones/zone-1/purge_cache");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token-1");
    expect(JSON.parse(String(init.body))).toEqual({ tags: ["a", "b"] });
  });

  it("skips the call when Cloudflare is not configured", async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;

    expect(await purgeCloudflareCache({ tags: ["a"] })).toEqual({ success: true, skipped: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails open on an HTTP error", async () => {
    mockFetch.mockResolvedValue(jsonResponse(429, { success: false, errors: [] }));

    const outcome = await purgeCloudflareCache({ tags: ["a"] });

    expect(outcome).toEqual({ success: false, error: "Cloudflare purge failed: 429" });
  });

  it("reports an API rejection to Sentry", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { success: false, errors: [{ code: 1134, message: "Rate limited" }] }),
    );

    const outcome = await purgeCloudflareCache({ tags: ["a"] });

    expect(outcome).toEqual({ success: false, error: "Cloudflare purge rejected: 1134: Rate limited" });
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      tags: { section: "cdn-purge" },
    }));
  });

  it("reports a response that isn't the documented envelope", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { ok: true }));

    const outcome = await purgeCloudflareCache({ tags: ["a"] });

    expect(outcome.success).toBe(false);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("purges an event's pages in one request, tagged with the site host", async () => {
    await purgeEventPagesFromCdn([{ slug: "concert", city: undefined, region: { id: 1, name: "Maresme", slug: "maresme" } }]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      tags: [
        "www.esdeveniments.cat:home",
        "www.esdeveniments.cat:place:catalunya",
        "www.esdeveniments.cat:place:maresme",
        "www.esdeveniments.cat:event:concert",
      ],
    });
  });
});
