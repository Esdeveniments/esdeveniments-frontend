import { describe, expect, it } from "vitest";
import { getHistoricDates, normalizeMonthParam } from "lib/dates";

describe("normalizeMonthParam", () => {
  it("maps marc slug to març label", () => {
    const result = normalizeMonthParam("marc");
    expect(result).toEqual({ slug: "marc", label: "març" });
  });

  it("decodes encoded març and returns consistent slug/label", () => {
    const result = normalizeMonthParam("mar%C3%A7");
    expect(result).toEqual({ slug: "marc", label: "març" });
  });

  it("lowercases and passes through other months unchanged", () => {
    const result = normalizeMonthParam("GENER");
    expect(result).toEqual({ slug: "gener", label: "gener" });
  });

  it("works with getHistoricDates using the slug", () => {
    const { slug } = normalizeMonthParam("mar%C3%A7");
    expect(() => getHistoricDates(slug, 2024)).not.toThrow();
  });
});

