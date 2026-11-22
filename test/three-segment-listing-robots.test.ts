import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategorySummaryResponseDTO } from "types/api/category";

vi.mock("@lib/api/categories", () => ({
  getCategories: vi.fn(async (): Promise<CategorySummaryResponseDTO[]> => [
    { id: 1, name: "Teatre", slug: "teatre" },
    { id: 2, name: "Música", slug: "musica" },
  ]),
}));

vi.mock("@utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/helpers")>();
  return {
    ...actual,
    getPlaceTypeAndLabelCached: vi.fn(async (place: string) => ({
      type: place === "catalunya" ? "region" : "town",
      label: place === "catalunya" ? "Catalunya" : "Barcelona",
    })),
  };
});

import { siteUrl } from "@config/index";
import { generateMetadata } from "app/[locale]/[place]/[byDate]/[category]/page";

const ORIGINAL_ENV = { ...process.env };

function fulfilled<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

describe("3-segment listing generateMetadata robots policy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it.each([
    ["barcelona", "avui", "teatre"],
    ["catalunya", "cap-de-setmana", "musica"],
  ] as const)(
    "always emits noindex, follow for expandable 3-segment route /%s/%s/%s to match proxy.ts",
    async (place, byDate, category) => {
      const meta = await generateMetadata({
        params: fulfilled({ locale: "ca", place, byDate, category }),
        searchParams: fulfilled({}),
      });

      expect(meta).toMatchObject({
        robots: "noindex, follow",
        alternates: { canonical: `${siteUrl}/${place}/${category}` },
      });
    },
  );
});
