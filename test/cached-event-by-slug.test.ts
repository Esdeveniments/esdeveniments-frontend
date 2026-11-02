import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { cacheLife, cacheTag } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getInternalApiUrl: vi.fn(async (path: string) => `http://internal${path}`),
}));
vi.mock("@lib/validation/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/validation/event")>()),
  parseEventDetail: vi.fn((raw: unknown) => raw),
}));

import { getCachedEventBySlug } from "@lib/api/events";

const fetchMock = vi.fn();

describe("getCachedEventBySlug", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  it("returns the event, tags it and caches it for hours", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ slug: "concert-1", title: "Concert" }), { status: 200 }),
    );

    const event = await getCachedEventBySlug("concert-1");

    expect(event).toMatchObject({ slug: "concert-1", title: "Concert" });
    expect(cacheTag).toHaveBeenCalledWith("events", "event:concert-1");
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(fetchMock.mock.calls[0][0]).toBe("http://internal/api/events/concert-1");
  });

  it("returns null for a real 404 and caches it only for minutes", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(getCachedEventBySlug("gone")).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });

  it("throws on a server error so an outage is never cached as not found", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 503 }));

    await expect(getCachedEventBySlug("concert-1")).rejects.toThrow("503");
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it("throws when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getCachedEventBySlug("concert-1")).rejects.toThrow("fetch failed");
    expect(cacheLife).not.toHaveBeenCalled();
  });
});
