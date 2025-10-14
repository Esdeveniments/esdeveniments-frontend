import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchEvents, insertAds } from "../lib/api/events";
import {
  PagedResponseDTO,
  EventSummaryResponseDTO,
  ListEvent,
} from "types/api/event";

const originalEnv = { ...process.env };

describe("lib/api/events", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns safe fallback when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const result: PagedResponseDTO<EventSummaryResponseDTO> = await fetchEvents(
      { page: 0, size: 10 }
    );
    expect(result).toEqual({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
  });

  it("maps params correctly and serializes only defined ones", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    process.env.HMAC_SECRET = "test-secret";

    const mockJson = vi.fn().mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    const mockFetch = vi.fn().mockResolvedValue({ json: mockJson });
    (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

    await fetchEvents({ place: "barcelona", term: "music", page: 2, size: 20 });
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const options = mockFetch.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("https://api.example.com/events?");
    expect(calledUrl).toContain("place=barcelona");
    expect(calledUrl).toContain("term=music");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("size=20");
    expect(calledUrl).not.toContain("lat=");
    expect(calledUrl).not.toContain("lon=");

    // Verify security headers are set
    expect(options.headers).toBeInstanceOf(Headers);
    const timestampHeader = (options.headers as Headers).get("x-timestamp");
    const hmacHeader = (options.headers as Headers).get("x-hmac");
    expect(timestampHeader).toBeDefined();
    expect(hmacHeader).toBeDefined();
    expect(typeof timestampHeader).toBe("string");
    expect(typeof hmacHeader).toBe("string");
    expect(!isNaN(parseInt(timestampHeader!))).toBe(true);
    expect(hmacHeader!.length).toBe(64); // SHA-256 hex length
  });

  it("insertAds returns empty when no events", () => {
    const result = insertAds([]);
    expect(result).toEqual([]);
  });

  it("insertAds inserts ads near the provided frequency", () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
    })) as EventSummaryResponseDTO[];
    const list = insertAds(events, 4);
    const adCount = list.filter((e: ListEvent) => e.isAd).length;
    // Allow broader tolerance to avoid coupling to exact implementation
    expect(adCount).toBeGreaterThanOrEqual(3);
    expect(adCount).toBeLessThanOrEqual(7);
  });
});
