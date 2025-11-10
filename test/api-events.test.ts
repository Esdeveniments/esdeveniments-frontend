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

  it("returns safe fallback when backend URL is missing (internal route returns empty)", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const mockJson = vi.fn().mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

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
    // Called internal API route
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/events?");
  });

  it("maps params correctly and hits internal route (no HMAC headers here)", async () => {
    const mockJson = vi.fn().mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

    await fetchEvents({ place: "barcelona", term: "music", page: 2, size: 20 });
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const options = mockFetch.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/api/events?");
    expect(calledUrl).toContain("place=barcelona");
    expect(calledUrl).toContain("term=music");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("size=20");
    expect(options?.headers).toBeUndefined();
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
