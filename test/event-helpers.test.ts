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

describe("resolveEventLocalizedText and N-locale translations map", () => {
  const base = {
    title: "Festa Major de Cardedeu",
    description: "Concerts i cercavila al centre.",
  };

  it("scales to arbitrary locales (es, en, fr, regional variants) with separate field flags", () => {
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
            fr: {
              title: "Fête Majeure de Cardedeu",
              description: "Concerts et défilé au centre.",
            },
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
            fr: {
              title: "Fête Majeure de Cardedeu",
              description: "Concerts et défilé au centre.",
            },
          },
        },
        "fr",
      ),
    ).toEqual({
      title: "Fête Majeure de Cardedeu",
      description: "Concerts et défilé au centre.",
      titleTranslated: true,
      descriptionTranslated: true,
    });

    // Regional tag falls back to base language and can override title independently.
    expect(
      resolveEventLocalizedText(
        {
          ...base,
          translations: {
            en: {
              title: "Cardedeu Festival",
              description: "Concerts and parade in the town center.",
            },
            "en-gb": { title: "Cardedeu Town Festival" },
          },
        },
        "en-GB",
      ),
    ).toEqual({
      title: "Cardedeu Town Festival",
      description: "Concerts and parade in the town center.",
      titleTranslated: true,
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

  it("blocks unsafe keys, prioritizes supported locales, keeps plain RSC objects, and strips summary descriptions", () => {
    const extraLocales = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [
        `fr-x-${String(i).padStart(2, "0")}`,
        { title: `Extra ${i}` },
      ]),
    );
    const rawTranslations = JSON.parse(
      JSON.stringify({
        ...extraLocales,
        __proto__: { title: "polluted" },
        constructor: { title: "bad" },
        toString: { title: "bad-tostring" },
        valueOf: { title: "bad-valueof" },
        ca: { title: "Ignored default locale" },
        ES: { title: "Uppercase fallback", description: "Texto mayúscula" },
        es: { title: "Fiesta Mayor de Cardedeu", description: "Descripción en español" },
        "es-419": { title: "Fiesta Mayor LATAM" },
        "zh-hans": { title: "卡德德乌节" },
        en: { title: "null", description: "   " },
        fr: "malformed-entry",
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
    // Plain object prototype required by React Flight RSC serialization.
    expect(Object.getPrototypeOf(detail?.translations)).toBe(Object.prototype);
    expect(Object.hasOwn(detail?.translations ?? {}, "constructor")).toBe(false);
    expect(Object.hasOwn(detail?.translations ?? {}, "toString")).toBe(false);
    expect(Object.hasOwn(detail?.translations ?? {}, "tostring")).toBe(false);
    expect(Object.hasOwn(detail?.translations ?? {}, "valueOf")).toBe(false);
    expect(Object.hasOwn(detail?.translations ?? {}, "ca")).toBe(false);
    expect(Object.hasOwn(detail?.translations ?? {}, "en")).toBe(false);
    // Supported locales survive even past 32 extra tags, and canonical BCP-47 casing is preserved.
    expect(detail?.translations?.es).toEqual({
      title: "Fiesta Mayor de Cardedeu",
      description: "Descripción en español",
    });
    expect(detail?.translations?.["es-419"]).toEqual({
      title: "Fiesta Mayor LATAM",
    });
    expect(detail?.translations?.["zh-Hans"]).toEqual({
      title: "卡德德乌节",
    });
    // Related events keep translated title only, never description.
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
        fr: {
          title: "Concert sur la place",
          description: "Long texte français inutile sur les cartes",
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
      fr: { title: "Concert sur la place" },
    });
    // Catalan-only summary omits the `translations` key completely.
    expect("translations" in (paged?.content[1] ?? {})).toBe(false);

    const categorized = parseCategorizedEvents({ musica: [summaryItem] });
    expect(categorized?.musica?.[0]?.translations).toEqual({
      fr: { title: "Concert sur la place" },
    });
  });
});
