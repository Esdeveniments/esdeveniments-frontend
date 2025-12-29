import { describe, it, expect } from "vitest";
import { dedupeEvents } from "../components/ui/eventsAround/EventsAroundServer";
import type { EventSummaryResponseDTO } from "../types/api/event";

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
  startTime: "10:00",
  endDate: "2099-01-01",
  endTime: "12:00",
  location: "Barcelona",
  visits: 0,
  origin: "SCRAPE",
  categories: [],
};

describe("dedupeEvents", () => {
  it("deduplicates events with identical ids before rendering", () => {
    const events = [
      baseEvent,
      { ...baseEvent, title: "Duplicate Event" },
      { ...baseEvent, id: "event-2", slug: "event-two", title: "Event Two" },
    ];

    const deduped = dedupeEvents(events);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].title).toBe("Event One");
    expect(deduped[1].title).toBe("Event Two");
  });

  it("uses the slug as fallback when ids are missing", () => {
    const events = [
      { ...baseEvent, id: undefined as unknown as string, slug: "shared-slug" },
      {
        ...baseEvent,
        id: undefined as unknown as string,
        slug: "shared-slug",
        title: "Duplicate slug",
      },
      {
        ...baseEvent,
        id: undefined as unknown as string,
        slug: "unique-slug",
        title: "Unique slug",
      },
    ];

    const deduped = dedupeEvents(events);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].title).toBe("Event One");
    expect(deduped[1].title).toBe("Unique slug");
  });
});

