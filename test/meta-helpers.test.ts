import { describe, it, expect, afterEach } from "vitest";
import { generateEventMetadata, getCanonicalUrl } from "../lib/meta";

describe("meta helpers (black-box)", () => {
  it("generateEventMetadata returns expected fields", () => {
    const meta = generateEventMetadata(
      {
        id: "1",
        title: "Concert de prova",
        description: "Música en viu",
        location: "Plaça Major",
        city: { id: 1, name: "Vic", slug: "vic", postalCode: "08500" },
        region: { id: 2, name: "Osona", slug: "osona" },
        startDate: "2025-06-20",
        endDate: "2025-06-20",
        slug: "concert-de-prova-1",
        categories: [{ id: 10, name: "Música", slug: "musica" }],
        visits: 0,
        imageUrl: "https://example.com/image.jpg",
        relatedEvents: [],
        weather: null,
      } as any,
      "https://www.esdeveniments.cat/e/concert-de-prova-1"
    );

    expect(meta.title).toBeDefined();
    expect(meta.description).toBeDefined();
    expect(meta.openGraph?.url).toBe(
      "https://www.esdeveniments.cat/e/concert-de-prova-1"
    );
    const ogImages = Array.isArray(meta.openGraph?.images)
      ? meta.openGraph?.images
      : meta.openGraph?.images
      ? [meta.openGraph.images]
      : [];
    expect(ogImages.length).toBeGreaterThan(0);
    expect(meta.alternates?.canonical).toBe(
      "https://www.esdeveniments.cat/e/concert-de-prova-1"
    );
  });

  it("generateEventMetadata does not double-prefix hreflang URLs", () => {
    const meta = generateEventMetadata(
      {
        id: "1",
        title: "Concert de prova",
        description: "Música en viu",
        location: "Plaça Major",
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
        startDate: "2025-06-20",
        endDate: "2025-06-20",
        slug: "concert-de-prova-1",
        categories: [{ id: 10, name: "Música", slug: "musica" }],
        visits: 0,
        imageUrl: "https://example.com/image.jpg",
        relatedEvents: [],
        weather: undefined,
        hash: "h",
        isPromoted: false,
        url: "https://example.com",
        startTime: null,
        endTime: null,
        origin: "MANUAL",
      },
      // Simulate a localized canonical input (regression case)
      "https://www.esdeveniments.cat/es/e/concert-de-prova-1",
      undefined,
      "es"
    );

    const langs = meta.alternates?.languages ?? {};

    expect(langs["es"]).toContain("/es/e/");
    expect(langs["es"]).not.toContain("/es/es/");
    expect(langs["en"]).not.toContain("/en/en/");

    // x-default should always point to the default (Catalan) URL
    expect(langs["x-default"]).toBe(langs["ca"]);
    expect(langs["x-default"]).not.toContain("/es/");
  });

  it("getCanonicalUrl builds absolute URL with siteUrl base", () => {
    // In tests, siteUrl may resolve to localhost depending on env.
    expect(getCanonicalUrl("/barcelona")).toContain("/barcelona");
    expect(getCanonicalUrl("https://www.esdeveniments.cat/mataro")).toBe(
      "https://www.esdeveniments.cat/mataro"
    );
  });

  describe("generateEventMetadata robots policy", () => {
    const baseEvent = {
      id: "1",
      title: "Concert",
      description: "Live music",
      location: "Plaça Major",
      city: { id: 1, name: "Vic", slug: "vic", postalCode: "08500" },
      region: { id: 2, name: "Osona", slug: "osona" },
      // Future event so the EXPIRED_EVENT_NOINDEX_DAYS branch doesn't fire.
      startDate: "2099-06-20",
      endDate: "2099-06-20",
      slug: "concert-1",
      categories: [{ id: 10, name: "Música", slug: "musica" }],
      visits: 0,
      imageUrl: "https://example.com/image.jpg",
      relatedEvents: [],
      weather: null,
    } as any;

    const originalEnv = { ...process.env };
    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("does NOT emit noindex on production host", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const meta = generateEventMetadata(baseEvent);
      expect(meta.robots).not.toBe("noindex, nofollow");
    });

    it("does NOT emit noindex when NEXT_PUBLIC_SITE_URL is undefined (fail-open)", () => {
      // CRITICAL: Coolify Dockerfile only sets NEXT_PUBLIC_SITE_URL in the
      // builder stage, so at runtime in production it can be undefined. We
      // must NOT noindex production pages just because the env var is missing.
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const meta = generateEventMetadata(baseEvent);
      expect(meta.robots).not.toBe("noindex, nofollow");
    });

    it("emits noindex on staging host", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://staging.esdeveniments.cat";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const meta = generateEventMetadata(baseEvent);
      expect(meta.robots).toBe("noindex, nofollow");
    });

    it("emits noindex on PR-preview host with default Coolify template", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://42.esdeveniments.cat";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const meta = generateEventMetadata(baseEvent);
      expect(meta.robots).toBe("noindex, nofollow");
    });

    it("emits noindex when NEXT_PUBLIC_VERCEL_ENV=preview", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
      const meta = generateEventMetadata(baseEvent);
      expect(meta.robots).toBe("noindex, nofollow");
    });

    it("emits {index:false, follow:true} for events with malformed (feed-leak) slugs", () => {
      // GSC reported ~1,127 404s for slugs corrupted by upstream RSS/XML feed
      // imports. Until the backend slug generator is fixed, the frontend
      // noindexes these on the detail page so Google drops them from the index.
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const malformedEvent = {
        ...baseEvent,
        slug:
          "bibliobustitle-linkhttpswwwsbgcatactualitatagenda2400-bibliobushtmllink-descriptioncdata-2400-fri-27-mar-2026",
      };
      const meta = generateEventMetadata(malformedEvent);
      expect(meta.robots).toEqual({ index: false, follow: true });
    });
  });

  describe("generateEventMetadata title and description", () => {
    const event = {
      id: "1",
      title: "6a Castaween",
      description: "",
      location: "La Llagosta",
      city: { id: 1, name: "La Llagosta", slug: "la-llagosta" },
      region: { id: 2, name: "Vallès Oriental", slug: "valles-oriental" },
      startDate: "2099-10-07",
      endDate: "2099-10-07",
      slug: "6a-castaween",
      categories: [],
      visits: 0,
      relatedEvents: [],
      weather: null,
    } as any;

    it("adds a localized date so ca/es/en titles differ", () => {
      expect(generateEventMetadata(event, undefined, undefined, "ca").title).toBe(
        "6a Castaween | 7 d’octubre | La Llagosta | Vallès Oriental",
      );
      expect(generateEventMetadata(event, undefined, undefined, "es").title).toBe(
        "6a Castaween | 7 de octubre | La Llagosta | Vallès Oriental",
      );
      expect(generateEventMetadata(event, undefined, undefined, "en").title).toBe(
        "6a Castaween | October 7 | La Llagosta | Vallès Oriental",
      );
    });

    it("keeps the date when a long title must be cut", () => {
      const title = generateEventMetadata(
        { ...event, title: "Festa Major 2099: taller de creació d'objectes amb llana i altres" },
        undefined,
        undefined,
        "ca",
      ).title as string;
      expect(title.endsWith("| 7 d’octubre")).toBe(true);
      expect(title.length).toBeLessThanOrEqual(70);
    });

    it("uses a date range for short multi-day events and none for long ones", () => {
      const range = { ...event, endDate: "2099-10-09" };
      expect(generateEventMetadata(range, undefined, undefined, "ca").title).toContain(
        "7–9 d’octubre",
      );
      const exhibition = { ...event, endDate: "2099-12-31" };
      expect(generateEventMetadata(exhibition, undefined, undefined, "ca").title).toBe(
        "6a Castaween | La Llagosta | Vallès Oriental",
      );
    });

    it("uses the Catalan backend metaTitle only for the default locale", () => {
      const withBackend = { ...event, metaTitle: "6a Castaween – La Llagosta – 7 oct. 2099" };
      expect(generateEventMetadata(withBackend, undefined, undefined, "ca").title).toBe(
        "6a Castaween – La Llagosta – 7 oct. 2099",
      );
      expect(generateEventMetadata(withBackend, undefined, undefined, "es").title).toContain(
        "7 de octubre",
      );
    });

    it("pads a short description with the suffix sentence, only when it fits", () => {
      const suffix = "Consulta l'horari, com arribar-hi i més plans a prop.";
      const short = generateEventMetadata(event, undefined, undefined, "ca", suffix);
      expect(short.description).toBe(
        `6a Castaween - 7 d’octubre del 2099 - La Llagosta. ${suffix}`,
      );
      const long = generateEventMetadata(
        { ...event, description: "Una festa de castanyes i disfresses ".repeat(5) },
        undefined,
        undefined,
        "ca",
        suffix,
      );
      expect(long.description).not.toContain(suffix);
    });
  });
});
