import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCache, createKeyedCache } from "lib/api/cache";

describe("createCache", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["performance"] });
  });

  it("calls fetcher on first invocation", async () => {
    const { cache } = createCache<string>(5000);
    const fetcher = vi.fn().mockResolvedValue("data");

    const result = await cache(fetcher);

    expect(result).toBe("data");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("returns cached value within TTL", async () => {
    const { cache } = createCache<string>(5000);
    const fetcher = vi.fn().mockResolvedValue("data");

    await cache(fetcher);
    vi.advanceTimersByTime(3000); // within TTL
    const result = await cache(fetcher);

    expect(result).toBe("data");
    expect(fetcher).toHaveBeenCalledOnce(); // not called a second time
  });

  it("refetches after TTL expires", async () => {
    const { cache } = createCache<string>(5000);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    const result1 = await cache(fetcher);
    vi.advanceTimersByTime(6000); // past TTL
    const result2 = await cache(fetcher);

    expect(result1).toBe("first");
    expect(result2).toBe("second");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clear() invalidates the cache", async () => {
    const { cache, clear } = createCache<string>(5000);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("original")
      .mockResolvedValueOnce("refreshed");

    await cache(fetcher);
    clear();
    const result = await cache(fetcher);

    expect(result).toBe("refreshed");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("propagates fetcher errors", async () => {
    const { cache } = createCache<string>(5000);
    const fetcher = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(cache(fetcher)).rejects.toThrow("network error");
  });
});

describe("createKeyedCache", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["performance"] });
  });

  it("caches values by key independently", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const fetcherA = vi.fn().mockResolvedValue("value-A");
    const fetcherB = vi.fn().mockResolvedValue("value-B");

    const a = await cache("key-a", fetcherA);
    const b = await cache("key-b", fetcherB);

    expect(a).toBe("value-A");
    expect(b).toBe("value-B");
    expect(fetcherA).toHaveBeenCalledOnce();
    expect(fetcherB).toHaveBeenCalledOnce();
  });

  it("returns cached entry within TTL for same key", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const fetcher = vi.fn().mockResolvedValue("data");

    await cache("k1", fetcher);
    vi.advanceTimersByTime(3000);
    const result = await cache("k1", fetcher);

    expect(result).toBe("data");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("refetches for a key after TTL expires", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("fresh");

    await cache("k1", fetcher);
    vi.advanceTimersByTime(6000);
    const result = await cache("k1", fetcher);

    expect(result).toBe("fresh");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clear() invalidates all keys", async () => {
    const { cache, clear } = createKeyedCache<string>(5000);
    const fetcherA = vi
      .fn()
      .mockResolvedValueOnce("a1")
      .mockResolvedValueOnce("a2");
    const fetcherB = vi
      .fn()
      .mockResolvedValueOnce("b1")
      .mockResolvedValueOnce("b2");

    await cache("a", fetcherA);
    await cache("b", fetcherB);
    clear();

    const resultA = await cache("a", fetcherA);
    const resultB = await cache("b", fetcherB);

    expect(resultA).toBe("a2");
    expect(resultB).toBe("b2");
  });

  it("passes the key to the fetcher", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const fetcher = vi.fn().mockResolvedValue("result");

    await cache(42, fetcher);

    expect(fetcher).toHaveBeenCalledWith(42);
  });

  it("supports numeric keys", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const fetcher = vi.fn().mockResolvedValue("numeric");

    const result = await cache(123, fetcher);

    expect(result).toBe("numeric");
  });
});

describe("storeEmpty option", () => {
  it("caches null and [] by default", async () => {
    const list = createCache<string[]>(5000);
    const listFetcher = vi.fn().mockResolvedValue([]);
    await list.cache(listFetcher);
    await list.cache(listFetcher);
    expect(listFetcher).toHaveBeenCalledOnce();

    const keyed = createKeyedCache<string | null>(5000);
    const keyedFetcher = vi.fn().mockResolvedValue(null);
    await keyed.cache("a", keyedFetcher);
    await keyed.cache("a", keyedFetcher);
    expect(keyedFetcher).toHaveBeenCalledOnce();
  });

  it("refetches null and [] when storeEmpty is false, and still caches real data", async () => {
    const list = createCache<string[]>(5000, { storeEmpty: false });
    const listFetcher = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue(["x"]);
    expect(await list.cache(listFetcher)).toEqual([]);
    expect(await list.cache(listFetcher)).toEqual(["x"]);
    await list.cache(listFetcher);
    expect(listFetcher).toHaveBeenCalledTimes(2);

    const keyed = createKeyedCache<string | null>(5000, { storeEmpty: false });
    const keyedFetcher = vi.fn().mockResolvedValueOnce(null).mockResolvedValue("v");
    expect(await keyed.cache("a", keyedFetcher)).toBeNull();
    expect(await keyed.cache("a", keyedFetcher)).toBe("v");
    await keyed.cache("a", keyedFetcher);
    expect(keyedFetcher).toHaveBeenCalledTimes(2);
  });
});

describe("maxEntries option", () => {
  it("drops the oldest key beyond the cap", async () => {
    const keyed = createKeyedCache<string>(5000, { maxEntries: 2 });
    const fetcher = vi.fn(async (key: string | number) => `v${key}`);
    await keyed.cache("a", fetcher);
    await keyed.cache("b", fetcher);
    await keyed.cache("c", fetcher);
    await keyed.cache("b", fetcher);
    await keyed.cache("a", fetcher);
    expect(fetcher.mock.calls.map(([k]) => k)).toEqual(["a", "b", "c", "a"]);
  });
});

// Requests on a cold process used to each call the backend for the same data.
describe("concurrent misses", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  it("createCache shares one fetch between concurrent misses", async () => {
    const { cache } = createCache<string>(5000);
    const gate = deferred<string>();
    const fetcher = vi.fn(() => gate.promise);

    const both = Promise.all([cache(fetcher), cache(fetcher)]);
    gate.resolve("data");

    expect(await both).toEqual(["data", "data"]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("createCache retries after a shared fetch fails", async () => {
    const { cache } = createCache<string>(5000);
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce("data");

    const results = await Promise.allSettled([cache(fetcher), cache(fetcher)]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(await cache(fetcher)).toBe("data");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("createCache doesn't store a fetch that started before clear()", async () => {
    const { cache, clear } = createCache<string>(5000);
    const gate = deferred<string>();
    const stale = cache(() => gate.promise);
    clear();
    gate.resolve("stale");
    expect(await stale).toBe("stale");

    expect(await cache(async () => "fresh")).toBe("fresh");
  });

  it("createKeyedCache shares one fetch per key", async () => {
    const { cache } = createKeyedCache<string>(5000);
    const gate = deferred<string>();
    const fetcher = vi.fn((key: string | number) =>
      key === "a" ? gate.promise : Promise.resolve(`value-${key}`),
    );

    const all = Promise.all([cache("a", fetcher), cache("a", fetcher), cache("b", fetcher)]);
    gate.resolve("value-a");

    expect(await all).toEqual(["value-a", "value-a", "value-b"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("createKeyedCache doesn't store a fetch that started before delete()", async () => {
    const { cache, delete: deleteKey } = createKeyedCache<string>(5000);
    const gate = deferred<string>();
    const stale = cache("event", () => gate.promise);
    deleteKey("event");
    gate.resolve("before-edit");
    await stale;

    expect(await cache("event", async () => "after-edit")).toBe("after-edit");
  });
});
