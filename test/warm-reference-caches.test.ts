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

const places = [{ id: 3, name: "Girona", slug: "girona" }];

function respond(url: string): Response {
  if (url.endsWith("/categories")) return Response.json(categories);
  if (url.endsWith("/places/regions/options")) return Response.json(regions);
  if (url.endsWith("/places/cities")) return Response.json(places);
  return Response.json([]); // /places/regions
}

beforeEach(() => {
  vi.mocked(fetchWithHmac).mockReset();
  vi.mocked(fetchWithHmac).mockImplementation(async (url) => respond(url));
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

    // categories, regions/options, and the place list (regions + cities)
    expect(fetchWithHmac).toHaveBeenCalledTimes(4);
    for (const [, options] of vi.mocked(fetchWithHmac).mock.calls) {
      expect(options).toMatchObject({ skipConnection: true });
    }

    // The pages and proxy.ts load their own module copies; they must all hit
    // the warm entries.
    vi.resetModules();
    const { fetchCategories } = await import("@lib/api/categories");
    const { fetchRegionsWithCities } = await import("@lib/api/regions");
    const { fetchPlaces } = await import("@lib/api/places");
    const { resolvePlaceForProxy } = await import("@lib/api/places-proxy");
    const { getCategoriesForProxy } = await import("@lib/api/categories-proxy");
    expect(await fetchCategories()).toEqual(categories);
    expect(await fetchRegionsWithCities()).toHaveLength(1);
    expect(await fetchPlaces()).toHaveLength(1);
    expect(await resolvePlaceForProxy("girona")).toEqual({ kind: "exists" });
    expect(await getCategoriesForProxy()).toEqual(categories);
    expect(fetchWithHmac).toHaveBeenCalledTimes(4);
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
