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
      isPromoted: false,
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
      isPromoted: false,
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

  it("uses localized event fields and localized empty-field fallbacks per locale", () => {
    const baseEvent: EventDetailResponseDTO = {
      id: "2",
      hash: "h2",
      slug: "festa-vic",
      title: "",
      isPromoted: false,
      url: null,
      description: "",
      imageUrl: null,
      startDate: "2099-06-20",
      startTime: null,
      endDate: null,
      endTime: null,
      location: "",
      visits: 0,
      origin: "SCRAPE",
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
      categories: [],
    };

    const emptyEs = generateJsonData(baseEvent, "es");
    expect(emptyEs.name).toBe("Evento en Vic");
    expect(emptyEs.description).toBe("Evento cultural en Vic");

    const emptyEn = generateJsonData(baseEvent, "en");
    expect(emptyEn.name).toBe("Event in Vic");
    expect(emptyEn.description).toBe("Cultural event in Vic");

    const translatedEs = generateJsonData(
      {
        ...baseEvent,
        title: "Festa Major de Vic",
        titleEs: "Fiesta Mayor de Vic",
        description: "Concerts a la plaça.",
        descriptionEs: "Conciertos en la plaza.",
      },
      "es",
    );
    expect(translatedEs.name).toBe("Fiesta Mayor de Vic");
    expect(translatedEs.description).toBe("Conciertos en la plaza.");
  });
});
