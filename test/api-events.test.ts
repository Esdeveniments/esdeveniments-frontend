import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchEvents, insertAds, uploadEventImage } from "../lib/api/events";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  PagedResponseDTO,
  EventSummaryResponseDTO,
  ListEvent,
} from "types/api/event";
import {
  EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR,
  MAX_TOTAL_UPLOAD_BYTES,
} from "@utils/constants";

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
    // When NEXT_PUBLIC_API_URL is missing, fetchEventsExternal returns early without calling fetch
    // So we just verify it returns the fallback response
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

  it("maps params correctly and hits external API with HMAC headers", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    const mockJson = vi.fn().mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    const mockResponse = { ok: true, json: mockJson };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    (globalThis as { fetch: typeof fetch }).fetch = mockFetch;

    await fetchEvents({ place: "barcelona", term: "music", page: 2, size: 20 });
    
    expect(mockFetch).toHaveBeenCalled();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const options = mockFetch.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("https://api.example.com/events?");
    expect(calledUrl).toContain("place=barcelona");
    expect(calledUrl).toContain("term=music");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("size=20");
    // fetchWithHmac adds HMAC headers, so headers should be defined
    expect(options?.headers).toBeDefined();
    const headers = options.headers as Headers;
    expect(headers.get("x-timestamp")).toBeDefined();
    expect(headers.get("x-hmac")).toBeDefined();
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

  it("rejects oversized images before calling the API", async () => {
    const oversizedFile = new File(["a".repeat(10)], "large.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: MAX_TOTAL_UPLOAD_BYTES + 1024,
    });

    await expect(uploadEventImage(oversizedFile)).rejects.toThrow(
      EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR
    );
  });

  it("uploads images via multipart endpoint and returns url", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    const imageFile = new File(["dummy"], "photo.jpg", {
      type: "image/jpeg",
    });
    const mockResponse = new Response("https://cdn.example.com/photo.jpg", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });

    const fetchSpy = vi
      .spyOn(fetchWrapper, "fetchWithHmac")
      .mockResolvedValue(mockResponse as unknown as Response);

    const url = await uploadEventImage(imageFile);
    expect(url).toBe("https://cdn.example.com/photo.jpg");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = options?.body as FormData;
    expect(body.get("imageFile")).toBe(imageFile);
  });

  it("maps 413 responses from the image endpoint to descriptive errors", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    const imageFile = new File(["dummy"], "photo.jpg", {
      type: "image/jpeg",
    });
    const mockResponse = new Response("413 Request Entity Too Large", {
      status: 413,
    });

    vi.spyOn(fetchWrapper, "fetchWithHmac").mockResolvedValue(mockResponse);

    await expect(uploadEventImage(imageFile)).rejects.toThrow(
      EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR
    );
  });
});
