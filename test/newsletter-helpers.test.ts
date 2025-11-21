import { describe, it, expect } from "vitest";
import {
  buildNewsletterContextMessage,
  buildNewsletterPropsFromContext,
} from "../utils/newsletter-helpers";
import type { PlaceTypeAndLabel } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";

describe("buildNewsletterContextMessage", () => {
  it("falls back to generic plans when no category or place", () => {
    const result = buildNewsletterContextMessage({});
    expect(result).toBe("els millors plans");
  });

  it("uses category when provided", () => {
    const result = buildNewsletterContextMessage({ categoryLabel: "Teatre" });
    expect(result).toBe("Teatre");
  });

  it("adds place with correct preposition for consonant towns", () => {
    const result = buildNewsletterContextMessage({
      placeLabel: "Barcelona",
      placeType: "town",
    });
    expect(result).toBe("els millors plans de Barcelona");
  });

  it("adds place with apostrophe for vowel towns", () => {
    const result = buildNewsletterContextMessage({
      placeLabel: "Esplugues",
      placeType: "town",
    });
    expect(result).toBe("els millors plans d'Esplugues");
  });

  it("includes byDate label in parentheses", () => {
    const result = buildNewsletterContextMessage({
      byDateLabel: "Avui",
    });
    expect(result).toBe("els millors plans (avui)");
  });

  it("combines category, place, and date", () => {
    const result = buildNewsletterContextMessage({
      categoryLabel: "Concerts",
      placeLabel: "Girona",
      placeType: "town",
      byDateLabel: "Cap de setmana",
    });
    expect(result).toBe("Concerts de Girona (cap de setmana)");
  });

  it("skips Catalunya place label", () => {
    const result = buildNewsletterContextMessage({
      placeLabel: "Catalunya",
    });
    expect(result).toBe("els millors plans");
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
