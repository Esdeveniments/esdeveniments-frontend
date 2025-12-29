import { describe, it, expect } from "vitest";
import { extractPlaceDateCategorySlugsFromHref } from "@utils/analytics-url";

describe("extractPlaceDateCategorySlugsFromHref", () => {
  it("extracts place + date when URL is /place/date", () => {
    expect(extractPlaceDateCategorySlugsFromHref("/barcelona/avui")).toEqual({
      placeSlug: "barcelona",
      dateSlug: "avui",
      categorySlug: undefined,
    });
  });

  it("extracts place + date + category when URL is /place/date/category", () => {
    expect(
      extractPlaceDateCategorySlugsFromHref("/catalunya/cap-de-setmana/musica")
    ).toEqual({
      placeSlug: "catalunya",
      dateSlug: "cap-de-setmana",
      categorySlug: "musica",
    });
  });

  it("extracts place + category when URL is /place/category", () => {
    expect(extractPlaceDateCategorySlugsFromHref("/catalunya/musica")).toEqual({
      placeSlug: "catalunya",
      dateSlug: undefined,
      categorySlug: "musica",
    });
  });

  it("supports non-canonical /place/category/date by recognizing date in 3rd segment", () => {
    expect(
      extractPlaceDateCategorySlugsFromHref("/catalunya/musica/dema")
    ).toEqual({
      placeSlug: "catalunya",
      dateSlug: "dema",
      categorySlug: "musica",
    });
  });

  it("ignores querystring", () => {
    expect(
      extractPlaceDateCategorySlugsFromHref("/barcelona/avui?utm_source=x")
    ).toEqual({
      placeSlug: "barcelona",
      dateSlug: "avui",
      categorySlug: undefined,
    });
  });

  it("returns empty object for empty href", () => {
    expect(extractPlaceDateCategorySlugsFromHref("")).toEqual({});
  });
});
