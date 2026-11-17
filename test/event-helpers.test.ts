import { describe, it, expect } from "vitest";
import {
  buildCalendarEventData,
  getDefaultEventNoun,
  getEventAnalyticsSlugs,
} from "@utils/event-helpers";
import type { EventDetailResponseDTO } from "types/api/event";

describe("getEventAnalyticsSlugs", () => {
  const region = { id: 2, name: "Vallès Oriental", slug: "valles-oriental" };

  it("uses the town, else the region, like view_event_page", () => {
    const city = {
      id: 1,
      name: "Cardedeu",
      slug: "cardedeu",
      latitude: 41.64,
      longitude: 2.36,
      postalCode: "08440",
      enabled: true,
    };
    const categories = [{ id: 1, name: "Concerts", slug: "concerts" }];
    expect(getEventAnalyticsSlugs({ categories, city, region })).toEqual({
      categorySlug: "concerts",
      placeSlug: "cardedeu",
    });
    expect(getEventAnalyticsSlugs({ categories: [], region })).toEqual({
      categorySlug: "",
      placeSlug: "valles-oriental",
    });
  });

  it("returns localized fallback event nouns from prebuilt labels", () => {
    expect(getDefaultEventNoun("ca")).toBe("Esdeveniment");
    expect(getDefaultEventNoun("es")).toBe("Evento");
    expect(getDefaultEventNoun("en")).toBe("Event");
    expect(getDefaultEventNoun("es", true)).toBe("Evento cultural");
    expect(getDefaultEventNoun("en", true)).toBe("Cultural event");
  });

  it("includes event analytics slugs in buildCalendarEventData", () => {
    const city = {
      id: 1,
      name: "Cardedeu",
      slug: "cardedeu",
      latitude: 41.64,
      longitude: 2.36,
      postalCode: "08440",
      enabled: true,
    };
    const data = buildCalendarEventData(
      {
        id: "ev-1",
        slug: "concert-cardedeu",
        title: "Concert",
        description: "Desc",
        location: "Plaça",
        startDate: "2026-12-01",
        endDate: null,
        city,
        region,
        categories: [{ id: 1, name: "Música", slug: "musica" }],
      } as unknown as EventDetailResponseDTO,
      "ca",
    );
    expect(data.analytics).toEqual({
      eventId: "ev-1",
      eventSlug: "concert-cardedeu",
      categorySlug: "musica",
      placeSlug: "cardedeu",
    });
  });
});
