import { describe, expect, it } from "vitest";
import { formatPlaceName } from "@utils/string-helpers";

describe("formatPlaceName", () => {
  it("capitalizes Catalan town names with particles", () => {
    expect(formatPlaceName("sant antoni de vilamajor")).toBe(
      "Sant Antoni de Vilamajor"
    );
    expect(formatPlaceName("la roca del valles")).toBe("La Roca del Valles");
  });

  it("handles apostrophes correctly", () => {
    expect(formatPlaceName("l'hospitalet de llobregat")).toBe(
      "L'Hospitalet de Llobregat"
    );
    expect(formatPlaceName("platja d'aro")).toBe("Platja d'Aro");
  });

  it("converts slug-like hyphens to spaced, capitalized words", () => {
    expect(formatPlaceName("sant-andreu-de-llavaneres")).toBe(
      "Sant Andreu de Llavaneres"
    );
  });

  it("keeps acronyms while fixing the rest", () => {
    expect(formatPlaceName("CCCB barcelona")).toBe("CCCB Barcelona");
  });
});
