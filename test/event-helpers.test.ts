import { describe, it, expect } from "vitest";
import {
  getEventAnalyticsSlugs,
  resolveEventLocalizedText,
} from "@utils/event-helpers";
import {
  parseCategorizedEvents,
  parseEventDetail,
  parsePagedEvents,
} from "@lib/validation/event";

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

describe("resolveEventLocalizedText and translations map", () => {
  const base = {
    title: "Festa Major de Cardedeu",
    description: "Concerts i cercavila al centre.",
  };

  it("resolves NON_DEFAULT_LOCALES with independent title and description flags", () => {
    expect(resolveEventLocalizedText(base, "es")).toEqual({
      title: "Festa Major de Cardedeu",
      description: "Concerts i cercavila al centre.",
      titleTranslated: false,
      descriptionTranslated: false,
    });

    expect(
      resolveEventLocalizedText(
        {
          ...base,
          translations: {
            es: { title: "Fiesta Mayor de Cardedeu", description: null },
          },
        },
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
          translations: {
            en: {
              title: "  ",
              description: "Concerts and parade in the town center.",
            },
          },
        },
        "en",
      ),
    ).toEqual({
      title: "Festa Major de Cardedeu",
      description: "Concerts and parade in the town center.",
      titleTranslated: false,
      descriptionTranslated: true,
    });

    expect(
      resolveEventLocalizedText(
        {
          ...base,
          translations: {
            es: {
              title: "Fiesta Mayor de Cardedeu",
              description: "Conciertos y pasacalles.",
            },
          },
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

  it("keeps only NON_DEFAULT_LOCALES, drops malformed values, and strips summary descriptions", () => {
    const rawTranslations = JSON.parse(
      JSON.stringify({
        __proto__: { title: "polluted" },
        constructor: { title: "bad" },
        ca: { title: "Ignored default locale" },
        fr: { title: "Dropped until fr is added to SUPPORTED_LOCALES" },
        es: { title: "Fiesta Mayor de Cardedeu", description: "Descripción en español" },
        en: { title: "null", description: "   " },
      }),
    );

    const detail = parseEventDetail({
      id: "evt-1",
      hash: "h1",
      slug: "festa-major-cardedeu",
      title: "Festa Major de Cardedeu",
      description: "Descripció en català",
      translations: rawTranslations,
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
          description: "Text llarg",
          translations: {
            es: {
              title: "Concierto en la plaza",
              description: "Texto largo que no debe viajar en tarjetas",
            },
          },
          startDate: "2099-08-16",
        },
      ],
    });

    expect(detail).not.toBeNull();
    expect(Object.getPrototypeOf(detail?.translations)).toBe(Object.prototype);
    expect(detail?.translations).toEqual({
      es: {
        title: "Fiesta Mayor de Cardedeu",
        description: "Descripción en español",
      },
    });
    expect(detail?.relatedEvents?.[0]?.translations).toEqual({
      es: { title: "Concierto en la plaza" },
    });

    const summaryItem = {
      id: "sum-1",
      hash: "hs1",
      slug: "concert-1",
      title: "Concert a la plaça",
      description: "Text en català",
      translations: {
        en: {
          title: "Square Concert",
          description: "Long English text unused on cards",
        },
      },
      url: null,
      imageUrl: null,
      startDate: "2099-08-16",
      startTime: null,
      endDate: null,
      endTime: null,
      location: "Plaça",
      visits: 1,
      origin: "SCRAPE",
      categories: [],
    };

    const paged = parsePagedEvents({
      currentPage: 0,
      pageSize: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
      content: [
        summaryItem,
        { ...summaryItem, id: "sum-2", translations: null },
      ],
    });
    expect(paged?.content[0]?.translations).toEqual({
      en: { title: "Square Concert" },
    });
    expect("translations" in (paged?.content[1] ?? {})).toBe(false);

    const categorized = parseCategorizedEvents({ musica: [summaryItem] });
    expect(categorized?.musica?.[0]?.translations).toEqual({
      en: { title: "Square Concert" },
    });
  });
});
