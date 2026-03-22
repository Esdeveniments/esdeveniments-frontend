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
