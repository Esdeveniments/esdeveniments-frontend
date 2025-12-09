import { describe, expect, it } from "vitest";
import {
  parsePagedEvents,
  parseEventDetail,
} from "@lib/validation/event";

const baseSummary = {
  id: "event-1",
  hash: "hash-1",
  slug: "event-1",
  title: "Sample Event",
  type: "FREE" as const,
  url: "https://example.com/event-1",
  description: "Great event",
  imageUrl: "https://cdn.example.com/event-1.jpg",
  startDate: "2024-01-01",
  startTime: "10:00",
  endDate: "2024-01-01",
  endTime: "12:00",
  location: "Barcelona",
  visits: 42,
  origin: "MANUAL" as const,
  categories: [{ id: 1, name: "Música", slug: "musica" }],
};

const baseDetail = {
  ...baseSummary,
  city: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
    latitude: 41.3851,
    longitude: 2.1734,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  },
  region: {
    id: 1,
    name: "Catalunya",
    slug: "catalunya",
  },
  province: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
  },
};

describe("parsePagedEvents", () => {
  it("attaches cache keys using the event hash", () => {
    const payload = {
      content: [baseSummary],
      currentPage: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };

    const result = parsePagedEvents(payload);
    expect(result).not.toBeNull();
    expect(result?.content[0].imageUrl).toContain("v=hash-1");
  });

  it("falls back to updatedAt when hash is missing", () => {
    const payload = {
      content: [
        {
          ...baseSummary,
          hash: "",
          updatedAt: "2024-01-02T00:00:00Z",
          imageUrl: "https://cdn.example.com/updated.jpg",
        },
      ],
      currentPage: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };

    const result = parsePagedEvents(payload);
    expect(result).not.toBeNull();
    expect(result?.content[0].imageUrl).toContain(
      "v=2024-01-02T00%3A00%3A00Z"
    );
  });
});

describe("parseEventDetail", () => {
  it("applies cache keys to detail and related events", () => {
    const payload = {
      ...baseDetail,
      hash: "detail-hash",
      imageUrl: "https://cdn.example.com/detail.jpg",
      relatedEvents: [
        {
          ...baseSummary,
          hash: "related-hash",
          imageUrl: "https://cdn.example.com/related.jpg",
        },
      ],
    };

    const result = parseEventDetail(payload);
    expect(result).not.toBeNull();
    expect(result?.imageUrl).toContain("v=detail-hash");
    expect(result?.relatedEvents?.[0].imageUrl).toContain("v=related-hash");
  });
});







