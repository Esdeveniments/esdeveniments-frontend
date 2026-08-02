import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@utils/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@utils/api-helpers")>(
    "@utils/api-helpers",
  );
  return {
    ...actual,
    getInternalApiUrl: vi.fn((path: string) =>
      Promise.resolve(`http://localhost:3000${path}`),
    ),
    getVercelProtectionBypassHeaders: vi.fn(() => ({})),
  };
});

const validEvent = {
  id: "1",
  hash: "abc123",
  slug: "test-event",
  title: "Test event",
  type: "FREE",
  url: "https://example.com/test-event",
  description: "",
  imageUrl: null,
  startDate: "2026-01-01",
  startTime: null,
  endDate: null,
  endTime: null,
  location: "",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

const pagedResponse = {
  content: [validEvent],
  currentPage: 0,
  pageSize: 12,
  totalElements: 1,
  totalPages: 1,
  last: true,
};

describe("fetchEventsForMetadata", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed response on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(pagedResponse),
      }),
    );
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    const result = await fetchEventsForMetadata({ place: "sabadell" });
    expect(result).toEqual(pagedResponse);
  });

  it("returns null (not an empty page) on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    const result = await fetchEventsForMetadata({ place: "sabadell" });
    expect(result).toBeNull();
  });

  it("returns null on a malformed 2xx payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ garbage: true }),
      }),
    );
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    const result = await fetchEventsForMetadata({ place: "sabadell" });
    expect(result).toBeNull();
  });

  it("returns null instead of throwing on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    const result = await fetchEventsForMetadata({ place: "sabadell" });
    expect(result).toBeNull();
  });

  it("calls cacheTag/cacheLife on success (use cache boundary)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(pagedResponse),
      }),
    );
    const { cacheTag, cacheLife } = await import("next/cache");
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    await fetchEventsForMetadata({ place: "sabadell" });
    expect(cacheTag).toHaveBeenCalled();
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });

  it("uses the minutes profile on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const { cacheLife } = await import("next/cache");
    const { fetchEventsForMetadata } = await import("@lib/api/events");
    await fetchEventsForMetadata({ place: "sabadell" });
    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });
});
