import { describe, it, expect } from "vitest";
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
});
