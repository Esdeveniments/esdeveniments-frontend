import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateBreadcrumbList,
  deriveNameFromUrl,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import type { BreadcrumbItem } from "types/common";
import { siteUrl } from "@config/index";

describe("deriveNameFromUrl", () => {
  it("extracts and capitalizes simple path segments", () => {
    expect(deriveNameFromUrl(`${siteUrl}/barcelona`)).toBe("Barcelona");
    expect(deriveNameFromUrl(`${siteUrl}/noticies`)).toBe("Noticies");
    expect(deriveNameFromUrl(`${siteUrl}/sitemap`)).toBe("Sitemap");
  });

  it("converts slug-like segments with hyphens to readable names", () => {
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona`)).toBe("Barcelona");
    expect(deriveNameFromUrl(`${siteUrl}/e/esdeveniment-123`)).toBe("Esdeveniment 123");
    expect(deriveNameFromUrl(`${siteUrl}/noticies/palau-de-la-musica`)).toBe(
      "Palau De La Musica"
    );
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/sant-cugat-del-valles`)).toBe(
      "Sant Cugat Del Valles"
    );
  });

  it("handles URLs with query parameters and fragments", () => {
    expect(deriveNameFromUrl(`${siteUrl}/barcelona?filter=teatre`)).toBe("Barcelona");
    expect(deriveNameFromUrl(`${siteUrl}/noticies#section`)).toBe("Noticies");
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona?year=2025#top`)).toBe("Barcelona");
  });

  it("handles nested paths correctly", () => {
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona/2025`)).toBe("2025");
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona/2025/01`)).toBe("01");
    expect(deriveNameFromUrl(`${siteUrl}/noticies/catalunya/article-slug`)).toBe("Article Slug");
  });

  it("returns null for root URL or empty paths", () => {
    expect(deriveNameFromUrl(`${siteUrl}/`)).toBeNull();
    expect(deriveNameFromUrl(`${siteUrl}`)).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(deriveNameFromUrl("not-a-url")).toBeNull();
    expect(deriveNameFromUrl("")).toBeNull();
    expect(deriveNameFromUrl("//invalid")).toBeNull();
  });

  it("handles URLs with trailing slashes", () => {
    expect(deriveNameFromUrl(`${siteUrl}/barcelona/`)).toBe("Barcelona");
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona/`)).toBe("Barcelona");
  });

  it("preserves case for numeric segments", () => {
    expect(deriveNameFromUrl(`${siteUrl}/sitemap/barcelona/2025`)).toBe("2025");
    expect(deriveNameFromUrl(`${siteUrl}/events/123`)).toBe("123");
  });
});

describe("generateBreadcrumbList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns null for empty or null breadcrumbs", () => {
    expect(generateBreadcrumbList([])).toBeNull();
    expect(generateBreadcrumbList(null as unknown as BreadcrumbItem[])).toBeNull();
    expect(generateBreadcrumbList(undefined as unknown as BreadcrumbItem[])).toBeNull();
  });

  it("generates valid breadcrumb list with proper names", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "Arxiu", url: `${siteUrl}/sitemap` },
      { name: "Barcelona", url: `${siteUrl}/sitemap/barcelona` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}#breadcrumblist`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inici",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Arxiu",
          item: `${siteUrl}/sitemap`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Barcelona",
          item: `${siteUrl}/sitemap/barcelona`,
        },
      ],
    });
  });

  it("derives name from URL when breadcrumb name is empty", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "", url: `${siteUrl}/barcelona` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[1].name).toBe("Barcelona");
  });

  it("derives name from URL when breadcrumb name is whitespace only", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "   ", url: `${siteUrl}/noticies` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[1].name).toBe("Noticies");
  });

  it("derives readable name from slug-like URL segments", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "", url: `${siteUrl}/sitemap/sant-cugat-del-valles` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[1].name).toBe("Sant Cugat Del Valles");
  });

  it("falls back to 'Pàgina' when URL derivation fails", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "", url: siteUrl }, // Root URL, can't derive name
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[1].name).toBe("Pàgina");
  });

  it("derives name from URL when breadcrumb name is missing", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "", url: `${siteUrl}/barcelona` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    // Should derive "Barcelona" from the URL
    expect(result?.itemListElement[0].name).toBe("Barcelona");
  });

  it("uses generic fallback when URL derivation fails", () => {
    // Use an invalid URL that will cause deriveNameFromUrl to return null
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "", url: "invalid-url-that-will-fail-parsing" },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    // Should fall back to "Pàgina" when URL parsing fails
    expect(result?.itemListElement[0].name).toBe("Pàgina");
  });

  it("handles breadcrumbs with empty names gracefully", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "", url: `${siteUrl}/barcelona` },
      { name: "   ", url: `${siteUrl}/noticies` },
      { name: "", url: "invalid-url" },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[0].name).toBe("Barcelona"); // Derived
    expect(result?.itemListElement[1].name).toBe("Noticies"); // Derived
    expect(result?.itemListElement[2].name).toBe("Pàgina"); // Fallback
  });

  it("handles mixed valid and invalid breadcrumb names", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "", url: `${siteUrl}/barcelona` },
      { name: "Arxiu", url: `${siteUrl}/sitemap` },
      { name: "   ", url: `${siteUrl}/noticies` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[0].name).toBe("Inici");
    expect(result?.itemListElement[1].name).toBe("Barcelona"); // Derived
    expect(result?.itemListElement[2].name).toBe("Arxiu");
    expect(result?.itemListElement[3].name).toBe("Noticies"); // Derived
  });

  it("maintains correct position numbering", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "First", url: `${siteUrl}/first` },
      { name: "Second", url: `${siteUrl}/second` },
      { name: "Third", url: `${siteUrl}/third` },
    ];

    const result = generateBreadcrumbList(breadcrumbs);

    expect(result?.itemListElement[0].position).toBe(1);
    expect(result?.itemListElement[1].position).toBe(2);
    expect(result?.itemListElement[2].position).toBe(3);
  });
});

describe("generateWebPageSchema with breadcrumbs", () => {
  it("includes breadcrumb list when provided", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "Notícies", url: `${siteUrl}/noticies` },
    ];

    const schema = generateWebPageSchema({
      title: "Test Page",
      description: "Test description",
      url: `${siteUrl}/test`,
      breadcrumbs,
    });

    expect(schema.breadcrumb).toBeDefined();
    expect(schema.breadcrumb?.itemListElement).toHaveLength(2);
  });

  it("works without breadcrumbs", () => {
    const schema = generateWebPageSchema({
      title: "Test Page",
      description: "Test description",
      url: `${siteUrl}/test`,
    });

    expect(schema.breadcrumb).toBeUndefined();
  });
});

describe("generateCollectionPageSchema with breadcrumbs", () => {
  it("includes breadcrumb list when provided", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Inici", url: siteUrl },
      { name: "Arxiu", url: `${siteUrl}/sitemap` },
    ];

    const schema = generateCollectionPageSchema({
      title: "Test Collection",
      description: "Test description",
      url: `${siteUrl}/collection`,
      breadcrumbs,
      numberOfItems: 10,
    });

    expect(schema.breadcrumb).toBeDefined();
    expect(schema.breadcrumb?.itemListElement).toHaveLength(2);
  });
});

