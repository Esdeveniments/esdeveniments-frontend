import { describe, it, expect } from "vitest";
import {
  buildNewsletterContextMessage,
  buildNewsletterPropsFromContext,
} from "../utils/newsletter-helpers";
import type { PlaceTypeAndLabel } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";

describe("buildNewsletterContextMessage", () => {
  it("falls back to generic plans when no category/place/date", () => {
    expect(buildNewsletterContextMessage({})).toBe("els millors plans");
  });

  it("uses category in lower case when provided", () => {
    expect(
      buildNewsletterContextMessage({ categoryLabel: "Teatre" })
    ).toBe("esdeveniments de teatre");
  });

  it("adds place with correct preposition for consonant towns", () => {
    expect(
      buildNewsletterContextMessage({
        placeLabel: "Barcelona",
        placeType: "town",
      })
    ).toBe("els millors plans a Barcelona");
  });

  it("adds place with correct preposition for vowel towns", () => {
    expect(
      buildNewsletterContextMessage({
        placeLabel: "Esplugues",
        placeType: "town",
      })
    ).toBe("els millors plans a Esplugues");
  });

  it("includes date phrasing for weekend", () => {
    expect(
      buildNewsletterContextMessage({
        byDateLabel: "Cap de setmana",
      })
    ).toBe("els millors plans aquest cap de setmana");
  });

  it("combines category, date, and place naturally", () => {
    expect(
      buildNewsletterContextMessage({
        categoryLabel: "Literatura",
        byDateLabel: "Cap de setmana",
        placeLabel: "Barcelona",
        placeType: "town",
      })
    ).toBe("esdeveniments de literatura aquest cap de setmana a Barcelona");
  });

  it("handles today phrasing", () => {
    expect(
      buildNewsletterContextMessage({
        byDateLabel: "Avui",
        placeLabel: "Girona",
        placeType: "town",
      })
    ).toBe("els millors plans avui a Girona");
  });
});

describe("buildNewsletterPropsFromContext", () => {
  const categories: CategorySummaryResponseDTO[] = [
    { id: 1, name: "Teatre", slug: "teatre" },
  ];
  const placeTypeLabel: PlaceTypeAndLabel = { type: "town", label: "Barcelona" };

  it("builds props with normalized category/date labels", () => {
    const result = buildNewsletterPropsFromContext({
      place: "barcelona",
      placeTypeLabel,
      category: "teatre",
      date: "avui",
      categories,
    });

    expect(result).toEqual({
      place: "barcelona",
      placeLabel: "Barcelona",
      placeType: "town",
      category: "teatre",
      categoryLabel: "Teatre",
      byDate: "avui",
      byDateLabel: "Avui",
    });
  });

  it("omits default filters and derives place label when type label missing", () => {
    const result = buildNewsletterPropsFromContext({
      place: "catalunya",
      category: "tots",
      date: "tots",
      categories,
    });

    expect(result).toEqual({
      place: "catalunya",
      placeLabel: "catalunya",
      placeType: undefined,
      category: undefined,
      categoryLabel: undefined,
      byDate: undefined,
      byDateLabel: undefined,
    });
  });
});
