import { describe, expect, it } from "vitest";

import { generateJsonData } from "@utils/schema-helpers";
import type { EventDetailResponseDTO } from "types/api/event";

describe("schema helpers i18n", () => {
  it("generateJsonData localizes inLanguage and url when locale is provided", () => {
    const event: EventDetailResponseDTO = {
      id: "1",
      hash: "h",
      slug: "concert-de-prova-1",
      title: "Concert de prova",
      type: "FREE",
      url: "https://example.com",
      description: "Música en viu",
      imageUrl: "https://example.com/image.jpg",
      startDate: "2025-06-20",
      startTime: null,
      endDate: "2025-06-20",
      endTime: null,
      location: "Plaça Major",
      visits: 0,
      origin: "MANUAL",
      city: {
        id: 1,
        name: "Vic",
        slug: "vic",
        postalCode: "08500",
        latitude: 0,
        longitude: 0,
        rssFeed: null,
        enabled: true,
      },
      region: { id: 2, name: "Osona", slug: "osona" },
      province: { id: 3, name: "Barcelona", slug: "barcelona" },
      categories: [{ id: 10, name: "Música", slug: "musica" }],
      relatedEvents: [],
      weather: undefined,
    };

    const schema = generateJsonData(event, "es");

    expect(schema.inLanguage).toBe("es");
    expect(schema.url).toContain("/es/e/concert-de-prova-1");
    expect(schema["@id"]).toContain("/es/e/concert-de-prova-1");
  });

  it("generateJsonData defaults to Catalan when locale is omitted", () => {
    const event: EventDetailResponseDTO = {
      id: "1",
      hash: "h",
      slug: "concert-de-prova-1",
      title: "Concert de prova",
      type: "FREE",
      url: "https://example.com",
      description: "Música en viu",
      imageUrl: "https://example.com/image.jpg",
      startDate: "2025-06-20",
      startTime: null,
      endDate: "2025-06-20",
      endTime: null,
      location: "Plaça Major",
      visits: 0,
      origin: "MANUAL",
      city: {
        id: 1,
        name: "Vic",
        slug: "vic",
        postalCode: "08500",
        latitude: 0,
        longitude: 0,
        rssFeed: null,
        enabled: true,
      },
      region: { id: 2, name: "Osona", slug: "osona" },
      province: { id: 3, name: "Barcelona", slug: "barcelona" },
      categories: [{ id: 10, name: "Música", slug: "musica" }],
      relatedEvents: [],
      weather: undefined,
    };

    const schema = generateJsonData(event);

    expect(schema.inLanguage).toBe("ca");
    expect(schema.url).toContain("/e/concert-de-prova-1");
    expect(schema.url).not.toContain("/es/e/");
  });
});
