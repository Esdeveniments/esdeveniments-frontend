import { describe, it, expect } from "vitest";
import {
  getEventAnalyticsSlugs,
  resolveEventLocalizedText,
} from "@utils/event-helpers";
import { parseEventDetail } from "@lib/validation/event";

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
});

describe("resolveEventLocalizedText and event translation parsing", () => {
  const base = {
    title: "Festa Major de Cardedeu",
    description: "Concerts i cercavila al centre.",
  };

  it("returns separate titleTranslated and descriptionTranslated flags across partial fields", () => {
    expect(resolveEventLocalizedText(base, "es")).toEqual({
      title: "Festa Major de Cardedeu",
      description: "Concerts i cercavila al centre.",
      titleTranslated: false,
      descriptionTranslated: false,
    });

    expect(
      resolveEventLocalizedText(
        { ...base, titleEs: "Fiesta Mayor de Cardedeu", descriptionEs: null },
        "es",
      ),
    ).toEqual({
      title: "Fiesta Mayor de Cardedeu",
      description: "Concerts i cercavila al centre.",
      titleTranslated: true,
      descriptionTranslated: false,
    });

    expect(
      resolveEventLocalizedText(
        {
          ...base,
          titleEn: "  ",
          descriptionEn: "Concerts and parade in the town centre.",
        },
        "en",
      ),
    ).toEqual({
      title: "Festa Major de Cardedeu",
      description: "Concerts and parade in the town centre.",
      titleTranslated: false,
      descriptionTranslated: true,
    });

    expect(
      resolveEventLocalizedText(
        {
          ...base,
          titleEs: "Fiesta Mayor de Cardedeu",
          descriptionEs: "Conciertos y pasacalles en el centro.",
        },
        "ca",
      ),
    ).toEqual({
      title: "Festa Major de Cardedeu",
      description: "Concerts i cercavila al centre.",
      titleTranslated: false,
      descriptionTranslated: false,
    });
  });

  it("tolerates malformed or 'null' optional translations and strips relatedEvents translated descriptions", () => {
    const detail = parseEventDetail({
      id: "evt-1",
      hash: "h1",
      slug: "festa-major-cardedeu",
      title: "Festa Major de Cardedeu",
      titleEs: "null",
      titleEn: 42,
      description: "Descripció en català",
      descriptionEs: "Descripción en español",
      descriptionEn: "   ",
      url: null,
      imageUrl: null,
      startDate: "2099-08-15",
      startTime: null,
      endDate: null,
      endTime: null,
      location: "Plaça Sant Joan",
      visits: 5,
      origin: "SCRAPE",
      categories: [],
      city: {
        id: 1,
        name: "Cardedeu",
        slug: "cardedeu",
        latitude: 41.64,
        longitude: 2.36,
        postalCode: "08440",
        enabled: true,
      },
      region: { id: 2, name: "Vallès Oriental", slug: "valles-oriental" },
      province: { id: 3, name: "Barcelona", slug: "barcelona" },
      relatedEvents: [
        {
          id: "rel-1",
          slug: "concert-1",
          title: "Concert a la plaça",
          titleEs: "Concierto en la plaza",
          description: "Text llarg",
          descriptionEs: "Texto largo en español",
          descriptionEn: "Long English text",
          startDate: "2099-08-16",
        },
      ],
    });

    expect(detail).not.toBeNull();
    expect(detail?.titleEs).toBeNull();
    expect(detail?.titleEn).toBeNull();
    expect(detail?.descriptionEs).toBe("Descripción en español");
    expect(detail?.descriptionEn).toBeNull();
    expect(detail?.relatedEvents?.[0]?.titleEs).toBe("Concierto en la plaza");
    expect(detail?.relatedEvents?.[0]?.description).toBe("");
    expect(detail?.relatedEvents?.[0]?.descriptionEs).toBeNull();
    expect(detail?.relatedEvents?.[0]?.descriptionEn).toBeNull();
  });
});
