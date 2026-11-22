import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { cacheLife, cacheTag, markEventReadFailed, fetchWithHmac } = vi.hoisted(
  () => ({
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    markEventReadFailed: vi.fn(),
    fetchWithHmac: vi.fn(),
  }),
);
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
vi.mock("@lib/api/event-outage", () => ({ markEventReadFailed }));
vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac }));
vi.mock("@lib/validation/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/validation/event")>()),
  parseEventDetail: vi.fn((raw: unknown) => raw),
}));

import { connection } from "next/server";
import {
  fetchEventBySlug,
  fetchEventBySlugWithStatus,
  getCachedEventBySlug,
} from "@lib/api/events";

describe("getCachedEventBySlug", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchWithHmac.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
    markEventReadFailed.mockReset();
  });

  it("calls the backend wrapper directly with skipConnection, tags it and caches it for hours", async () => {
    fetchWithHmac.mockResolvedValue(
      new Response(JSON.stringify({ slug: "concert-1", title: "Concert" }), {
        status: 200,
      }),
    );

    const event = await getCachedEventBySlug("concert-1");

    expect(event).toMatchObject({ slug: "concert-1", title: "Concert" });
    expect(cacheTag).toHaveBeenCalledWith("events", "event:concert-1");
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(fetchWithHmac).toHaveBeenCalledWith(
      expect.stringMatching(/\/events\/concert-1$/),
      expect.objectContaining({ skipConnection: true }),
    );
  });

  it.each([
    ["404", 404, "gone"],
    ["400 malformed slug", 400, "<a href="],
  ])(
    "returns null for a backend %s and caches it only for minutes without tripping outage",
    async (_label, status, slug) => {
      fetchWithHmac.mockResolvedValue(new Response("not found", { status }));

      await expect(getCachedEventBySlug(slug)).resolves.toBeNull();
      expect(cacheLife).toHaveBeenCalledWith("minutes");
      expect(markEventReadFailed).not.toHaveBeenCalled();
    },
  );

  it("throws on a server error so an outage is never cached as not found", async () => {
    fetchWithHmac.mockResolvedValue(new Response("boom", { status: 503 }));

    await expect(getCachedEventBySlug("concert-1")).rejects.toThrow("503");
    expect(cacheLife).not.toHaveBeenCalled();
    expect(markEventReadFailed).toHaveBeenCalledWith("concert-1");
  });

  it("doesn't count a non-400/404 4xx (e.g. 429) as an outage or as not found", async () => {
    fetchWithHmac.mockResolvedValue(new Response("rate limited", { status: 429 }));

    await expect(getCachedEventBySlug("concert-1")).rejects.toThrow("429");
    expect(cacheLife).not.toHaveBeenCalled();
    expect(markEventReadFailed).not.toHaveBeenCalled();
  });

  it("throws when the network fails", async () => {
    fetchWithHmac.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getCachedEventBySlug("concert-1")).rejects.toThrow(
      "request failed",
    );
    expect(cacheLife).not.toHaveBeenCalled();
    expect(markEventReadFailed).toHaveBeenCalledWith("concert-1");
  });

  it("fetchEventBySlugWithStatus distinguishes 404/400 notFound from 5xx or valid-slug 400", async () => {
    fetchWithHmac.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    await expect(fetchEventBySlugWithStatus("gone")).resolves.toEqual({
      event: null,
      notFound: true,
    });

    fetchWithHmac.mockResolvedValueOnce(new Response("bad request", { status: 400 }));
    await expect(fetchEventBySlugWithStatus("valid-event-slug")).resolves.toEqual({
      event: null,
      notFound: false,
    });

    fetchWithHmac.mockResolvedValueOnce(new Response("boom", { status: 503 }));
    await expect(fetchEventBySlugWithStatus("down")).resolves.toEqual({
      event: null,
      notFound: false,
    });
  });

  it("propagates Next.js connection() rejections without tripping markEventReadFailed", async () => {
    const prerenderAbort = new Error("NEXT_PRERENDER_INTERRUPTED");
    vi.mocked(connection).mockRejectedValueOnce(prerenderAbort);

    await expect(fetchEventBySlug("concert-1")).rejects.toBe(prerenderAbort);
    expect(markEventReadFailed).not.toHaveBeenCalled();
  });
});
