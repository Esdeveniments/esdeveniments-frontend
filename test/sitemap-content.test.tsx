import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";

// Pure locale helpers, mocked so the test doesn't depend on locale config.
vi.mock("@utils/i18n-seo", () => ({
  toLocalizedUrl: (path: string) => path,
  withLocalePath: (path: string) => path,
}));

import SitemapContent from "components/sitemap/SitemapContent";

// Recursively count elements carrying a given data-testid, regardless of type.
function countByTestId(node: unknown, testId: string): number {
  let n = 0;
  const visit = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(visit);
      return;
    }
    const el = x as ReactElement;
    if ((el.props as Record<string, unknown>)?.["data-testid"] === testId) n += 1;
    const children = (el.props as { children?: unknown } | undefined)?.children;
    if (children) visit(children);
  };
  visit(node);
  return n;
}

const regions: RegionSummaryResponseDTO[] = [
  { id: 1, name: "Barcelonès", slug: "barcelones" },
  { id: 2, name: "Gironès", slug: "girones" },
];

const city = (id: number, name: string, slug: string): CitySummaryResponseDTO => ({
  id,
  name,
  slug,
  latitude: 41.3851,
  longitude: 2.1734,
  postalCode: "08001",
  rssFeed: null,
  enabled: true,
});

describe("SitemapContent", () => {
  it("renders a link per region and per city from the fetched data", async () => {
    const dataPromise = Promise.resolve({
      regions,
      cities: [city(1, "Barcelona", "barcelona"), city(2, "Girona", "girona")],
    });

    const element = await SitemapContent({ dataPromise, locale: "ca" });

    expect(countByTestId(element, "sitemap-region-link")).toBe(2);
    expect(countByTestId(element, "sitemap-city-link")).toBe(2);
  });

  it("renders no data links when the backend returns empty lists", async () => {
    const dataPromise = Promise.resolve({ regions: [], cities: [] });

    const element = await SitemapContent({ dataPromise, locale: "ca" });

    expect(countByTestId(element, "sitemap-region-link")).toBe(0);
    expect(countByTestId(element, "sitemap-city-link")).toBe(0);
  });
});
