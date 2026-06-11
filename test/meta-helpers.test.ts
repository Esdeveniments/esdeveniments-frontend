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
        type: "FREE",
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
  });
});
