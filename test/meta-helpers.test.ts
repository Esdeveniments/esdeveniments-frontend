import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateEventMetadata, getCanonicalUrl } from "../lib/meta";
import { EXPIRED_EVENT_NOINDEX_DAYS } from "@utils/constants";

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

    // Imported single-day events come with endDate: null (summer-moguda,
    // #808): the start day is then the last day.
    it.each([
      [61, { index: false, follow: true }],
      [30, undefined],
    ])("a single-day event with no end date, %i days ago", (daysAgo, robots) => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const startDate = new Date(Date.now() - daysAgo * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const meta = generateEventMetadata({ ...baseEvent, startDate, endDate: null });
      if (robots) expect(meta.robots).toEqual(robots);
      else expect(meta.robots).not.toEqual({ index: false, follow: true });
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

    it("uses the Catalan backend metaTitle and metaDescription only for the default locale", () => {
      const withBackend = {
        ...event,
        metaTitle: "6a Castaween – La Llagosta – 7 oct. 2099",
        metaDescription: "Vine a celebrar la 6a Castaween a La Llagosta el 7 d'octubre.",
      };
      expect(generateEventMetadata(withBackend, undefined, undefined, "ca").title).toBe(
        "6a Castaween – La Llagosta – 7 oct. 2099",
      );
      expect(
        generateEventMetadata(withBackend, undefined, undefined, "ca").description,
      ).toBe("Vine a celebrar la 6a Castaween a La Llagosta el 7 d'octubre.");

      const esMeta = generateEventMetadata(
        withBackend,
        undefined,
        undefined,
        "es",
        "Consulta horarios y cómo llegar.",
      );
      expect(esMeta.title).toContain("7 de octubre");
      expect(esMeta.description).not.toContain("Vine a celebrar");
      expect(esMeta.description).toContain("7 de octubre");
      expect(esMeta.description).toContain("La Llagosta");
    });

    it("keeps localized date, venue, and localized suffix instead of Catalan body on es/en", () => {
      const longCatalan = {
        ...event,
        description:
          "Una jornada plena d'activitats culturals, tallers infantils, música en directe i degustació de productes artesans per a tota la família al centre del poble.",
      };
      const esWithSuffix = generateEventMetadata(
        longCatalan,
        undefined,
        undefined,
        "es",
        "Consulta horarios y cómo llegar.",
      );
      expect(esWithSuffix.description).toBe(
        "6a Castaween - 7 de octubre de 2099 - La Llagosta. Consulta horarios y cómo llegar.",
      );
      expect(esWithSuffix.description).not.toContain("Una jornada plena");

      const enMeta = generateEventMetadata(longCatalan, undefined, undefined, "en");
      expect(enMeta.description).toContain("October 7, 2099");
      expect(enMeta.description).toContain("La Llagosta");
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

    it.each([
      ["ca", "7 d’octubre del 2099"],
      ["en", "October 7, 2099"],
    ] as const)(
      "writes the %s description as one plain line: facts first, then the text without markdown",
      (locale, date) => {
        const messy = {
          ...event,
          description:
            "**6a Castaween** – La Llagosta\n\nUna *nit* de [castanyes](https://example.com) i disfresses.\n\nEntrada lliure.",
        };
        expect(
          generateEventMetadata(messy, undefined, undefined, locale).description,
        ).toBe(
          `6a Castaween - ${date} - La Llagosta - Una nit de castanyes i disfresses. Entrada lliure.`,
        );
      },
    );

    it("cuts a long description once, at its own end, so the date and place are kept", () => {
      const sentence =
        "Una jornada plena d'activitats culturals, tallers infantils, música en directe i degustació de productes artesans. ";
      const description = generateEventMetadata(
        { ...event, description: sentence.repeat(4) },
        undefined,
        undefined,
        "ca",
        "Consulta l'horari.",
      ).description as string;
      expect(
        description.startsWith(
          "6a Castaween - 7 d’octubre del 2099 - La Llagosta - Una jornada plena",
        ),
      ).toBe(true);
      expect(description.match(/…|\.\.\./g)).toHaveLength(1);
      expect(description.endsWith("…")).toBe(true);
      expect(description.length).toBeLessThanOrEqual(157);
      expect(description).not.toContain("Consulta l'horari");
    });

    it("collapses stray whitespace and line breaks in the title and place", () => {
      const spaced = { ...event, title: "Festa\u00a0Major \n 2099", location: "Plaça   Major\n" };
      expect(generateEventMetadata(spaced, undefined, undefined, "ca").description).toBe(
        "Festa Major 2099 - 7 d’octubre del 2099 - Plaça Major",
      );
    });

    it("does not repeat the title when the description only restates it", () => {
      const echo = { ...event, description: "6a Castaween." };
      expect(generateEventMetadata(echo, undefined, undefined, "ca").description).toBe(
        "6a Castaween - 7 d’octubre del 2099 - La Llagosta",
      );
    });

    it.each([
      ["ca", "2099-10-09", "7 – 9 d’octubre del 2099"],
      ["es", "2099-10-09", "7 – 9 de octubre de 2099"],
      ["en", "2099-10-09", "October 7 – 9, 2099"],
      ["ca", "2099-11-02", "7 d’octubre – 2 de novembre del 2099"],
      ["en", "2099-11-02", "October 7 – November 2, 2099"],
      ["ca", "2101-10-09", "7 d’octubre del 2099 – 9 d’octubre del 2101"],
    ] as const)(
      "writes a multi-day date as a range with its month and year (%s, until %s)",
      (locale, endDate, range) => {
        expect(
          generateEventMetadata({ ...event, endDate }, undefined, undefined, locale)
            .description,
        ).toBe(`6a Castaween - ${range} - La Llagosta`);
      },
    );

    it("picks the longest fitting suffix tier for short, medium, and near-threshold leads without leaking Catalan prose on es/en", () => {
      const tiers = [
        "See times, venue details, directions and discover more local cultural events nearby.",
        "See times, directions and more things to do nearby.",
        "See times and how to get there.",
      ];
      const catalanBody = "Una jornada plena d'activitats culturals en català per a tothom.";

      const shortLead = generateEventMetadata(
        { ...event, title: "Jazz Night", location: "Vic", description: catalanBody },
        undefined,
        undefined,
        "en",
        tiers,
      ).description as string;
      expect(shortLead.length).toBeGreaterThanOrEqual(120);
      expect(shortLead.length).toBeLessThanOrEqual(156);
      expect(shortLead).toContain(tiers[0]);
      expect(shortLead).not.toContain("jornada");

      const mediumLead = generateEventMetadata(
        {
          ...event,
          title: "Festival Internacional de Música Clàssica",
          location: "Auditori Municipal",
          description: catalanBody,
        },
        undefined,
        undefined,
        "en",
        tiers,
      ).description as string;
      expect(mediumLead.length).toBeGreaterThanOrEqual(120);
      expect(mediumLead.length).toBeLessThanOrEqual(156);
      expect(mediumLead).toContain(tiers[1]);
      expect(mediumLead).not.toContain("jornada");

      // Lead ~110 chars: standard suffix would overflow 156, so compact suffix fits
      // and Catalan teaser is never leaked onto English/Spanish pages.
      const nearThresholdLead = generateEventMetadata(
        {
          ...event,
          title: "Concert simfònic extraordinari de tardor amb orquestra convidada",
          location: "Palau de la Música Catalana",
          description: catalanBody,
        },
        undefined,
        undefined,
        "en",
        tiers,
      ).description as string;
      expect(nearThresholdLead.length).toBeGreaterThanOrEqual(120);
      expect(nearThresholdLead.length).toBeLessThanOrEqual(156);
      expect(nearThresholdLead).toContain(tiers[2]);
      expect(nearThresholdLead).not.toContain("jornada");

      // Lead >= 120 chars on es/en: keeps factual lead without Catalan fallback.
      const alreadyLongLead = generateEventMetadata(
        {
          ...event,
          title:
            "Concert simfònic extraordinari de tardor amb orquestra convidada i cor juvenil",
          location: "Palau de la Música Catalana",
          description: catalanBody,
        },
        undefined,
        undefined,
        "en",
        tiers,
      ).description as string;
      expect(alreadyLongLead.length).toBeGreaterThanOrEqual(120);
      expect(alreadyLongLead.length).toBeLessThanOrEqual(156);
      expect(alreadyLongLead).not.toContain("jornada");
      expect(alreadyLongLead).not.toContain("See times");
    });
  });
});

describe("EXPIRED_EVENT_NOINDEX_DAYS", () => {
  it("matches the SEO audit's expired events threshold", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "seo-audit.py"), "utf8");
    const days = script.match(/^EXPIRED_EVENT_NOINDEX_DAYS = (\d+)$/m)?.[1];
    expect(Number(days)).toBe(EXPIRED_EVENT_NOINDEX_DAYS);
  });
});
