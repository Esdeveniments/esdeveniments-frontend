import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));

const categories = [{ id: 1, name: "Música", slug: "musica" }];
const regions = [
  {
    id: 1,
    name: "Barcelonès",
    cities: [
      { id: 2, value: "barcelona", label: "Barcelona", latitude: 41.39, longitude: 2.17 },
    ],
  },
];

function respond(url: string): Response {
  return Response.json(url.endsWith("/categories") ? categories : regions);
}

const SHARED_SLOTS = Symbol.for("esdeveniments.cache.slots");

beforeEach(() => {
  vi.mocked(fetchWithHmac).mockReset();
  vi.mocked(fetchWithHmac).mockImplementation(async (url) => respond(url));
  // Fresh shared store per test; simulates a new server process.
  delete (globalThis as Record<symbol, unknown>)[SHARED_SLOTS];
  vi.resetModules();
});

describe("createCache globalKey", () => {
  // Next bundles pages, API routes and instrumentation.ts separately, so each
  // gets its own module copy. A globalKey cache must still share one entry.
  it("shares one entry between two module copies", async () => {
    const a = await import("@lib/api/cache");
    vi.resetModules();
    const b = await import("@lib/api/cache");
    expect(a.createCache).not.toBe(b.createCache);

    const first = a.createCache<string>(60_000, { globalKey: "test" });
    const second = b.createCache<string>(60_000, { globalKey: "test" });
    await first.cache(async () => "warm");

    const fetcher = vi.fn(async () => "cold");
    expect(await second.cache(fetcher)).toBe("warm");
    expect(fetcher).not.toHaveBeenCalled();

    second.clear();
    expect(await first.cache(async () => "fresh")).toBe("fresh");
  });

  it("keeps caches without a globalKey separate", async () => {
    const { createCache } = await import("@lib/api/cache");
    const first = createCache<string>(60_000);
    const second = createCache<string>(60_000);
    await first.cache(async () => "warm");
    expect(await second.cache(async () => "other")).toBe("other");
  });
});

describe("warmReferenceCaches", () => {
  it("fills the caches the pages read, without connection()", async () => {
    const { warmReferenceCaches } = await import(
      "@lib/api/warm-reference-caches"
    );
    await warmReferenceCaches();

    expect(fetchWithHmac).toHaveBeenCalledTimes(2);
    for (const [, options] of vi.mocked(fetchWithHmac).mock.calls) {
      expect(options).toEqual({ skipConnection: true });
    }

    // The pages load their own module copy; they must hit the warm entry.
    vi.resetModules();
    const { fetchCategories } = await import("@lib/api/categories");
    const { fetchRegionsWithCities } = await import("@lib/api/regions");
    expect(await fetchCategories()).toEqual(categories);
    expect(await fetchRegionsWithCities()).toHaveLength(1);
    expect(fetchWithHmac).toHaveBeenCalledTimes(2);
  });

  it("never holds startup longer than the timeout", async () => {
    vi.mocked(fetchWithHmac).mockImplementation(() => new Promise(() => {}));
    const { warmReferenceCaches } = await import(
      "@lib/api/warm-reference-caches"
    );
    const start = Date.now();
    await warmReferenceCaches(50);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("doesn't cache a failed warm-up", async () => {
    vi.mocked(fetchWithHmac).mockResolvedValue(
      new Response("down", { status: 503 }),
    );
    const { warmReferenceCaches } = await import(
      "@lib/api/warm-reference-caches"
    );
    await warmReferenceCaches();

    vi.mocked(fetchWithHmac).mockImplementation(async (url) => respond(url));
    const { fetchCategories } = await import("@lib/api/categories");
    expect(await fetchCategories()).toEqual(categories);
  });
});
