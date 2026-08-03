import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getActivePromotedEvents } from "../../../lib/api/promotedEvents";
import * as fetchWrapper from "../../../lib/api/fetch-wrapper";
import type { EventSummaryResponseDTO } from "types/api/event";

const originalEnv = { ...process.env };

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash-1",
  slug: "event-one",
  title: "Event One",
  type: "FREE",
  url: "https://example.com/event-one",
  description: "Description",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2099-01-01",
  startTime: null,
  endDate: "2099-01-01",
  endTime: null,
  location: "Barcelona",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

describe("getActivePromotedEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_API_URL: "https://api.example.com" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns [] with no network call when the feature flag is off", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "false";
    const fetchSpy = vi.spyOn(fetchWrapper, "fetchWithHmac");

    const result = await getActivePromotedEvents({ type: "homepage" });

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns [] with no network call when the flag is unset", async () => {
    delete process.env.PROMOTED_EVENTS_ENABLED;
    const fetchSpy = vi.spyOn(fetchWrapper, "fetchWithHmac");

    const result = await getActivePromotedEvents({ type: "town", slug: "cardedeu" });

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("builds the right query string for a homepage scope", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const mockResponse = new Response(JSON.stringify({ content: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const fetchSpy = vi
      .spyOn(fetchWrapper, "fetchWithHmac")
      .mockResolvedValue(mockResponse);

    await getActivePromotedEvents({ type: "homepage" });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("scope=homepage");
    expect(url).not.toContain("slug=");
  });

  it("builds the right query string for a town scope", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const mockResponse = new Response(JSON.stringify({ content: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const fetchSpy = vi
      .spyOn(fetchWrapper, "fetchWithHmac")
      .mockResolvedValue(mockResponse);

    await getActivePromotedEvents({ type: "town", slug: "cardedeu" });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("scope=town");
    expect(url).toContain("slug=cardedeu");
  });

  it("returns [] (not a throw) on a non-2xx response", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const mockResponse = new Response("not found", { status: 404 });
    vi.spyOn(fetchWrapper, "fetchWithHmac").mockResolvedValue(mockResponse);

    const result = await getActivePromotedEvents({ type: "homepage" });

    expect(result).toEqual([]);
  });

  it("returns [] (not a throw) when fetchWithHmac rejects", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    vi.spyOn(fetchWrapper, "fetchWithHmac").mockRejectedValue(
      new Error("network down"),
    );

    const result = await getActivePromotedEvents({ type: "homepage" });

    expect(result).toEqual([]);
  });

  it("returns [] (not a throw) when content items don't match EventSummaryResponseDTOSchema", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const mockResponse = new Response(
      JSON.stringify({ content: [{ id: "malformed", title: "missing required fields" }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    vi.spyOn(fetchWrapper, "fetchWithHmac").mockResolvedValue(mockResponse);

    const result = await getActivePromotedEvents({ type: "homepage" });

    expect(result).toEqual([]);
  });

  it("caps results at MAX_PROMOTED_EVENTS", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const content = Array.from({ length: 20 }, (_, i) => ({
      ...baseEvent,
      id: `event-${i}`,
      hash: `hash-${i}`,
      slug: `event-${i}`,
      title: `Event ${i}`,
    }));
    const mockResponse = new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    vi.spyOn(fetchWrapper, "fetchWithHmac").mockResolvedValue(mockResponse);

    const result = await getActivePromotedEvents({ type: "homepage" });

    expect(result).toHaveLength(8);
  });

  it("does not call console.error/Sentry for a routine non-2xx", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockResponse = new Response("not found", { status: 404 });
    vi.spyOn(fetchWrapper, "fetchWithHmac").mockResolvedValue(mockResponse);

    await getActivePromotedEvents({ type: "homepage" });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
