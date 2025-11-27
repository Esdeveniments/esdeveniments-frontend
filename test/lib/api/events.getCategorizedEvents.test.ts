import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Mock React's cache to a simple in-memory memoizer for the test environment
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => {
      const memo = new Map<string, unknown>();
      return (...args: unknown[]) => {
        const key = JSON.stringify(args);
        if (!memo.has(key)) {
          memo.set(key, fn(...args));
        }
        return memo.get(key);
      };
    },
  } as typeof import("react");
});

// Ensure API URL is set so fetchers build absolute URLs
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://example.com";
});

describe("getCategorizedEvents cache wrapper", () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch as typeof fetch;
  });

  it("calls network only once for repeated calls within same request", async () => {
    // Mock global.fetch to avoid real network and to count invocations
    const fetchSpy = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ categories: [] }),
      } as unknown as Response;
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    // Import after mocking fetch to ensure wrapper uses the mocked fetch
    const { getCategorizedEvents } = await import("@lib/api/events");

    // Two sequential calls with same args should dedupe via React cache
    const a = await getCategorizedEvents(5);
    const b = await getCategorizedEvents(5);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});


