import { describe, expect, it } from "vitest";
import type { PlaceResponseDTO } from "types/api/place";
import { resolvePlaceSlugAliasFromPlaces } from "@utils/place-alias";

describe("resolvePlaceSlugAliasFromPlaces", () => {
  it("resolves missing hyphens", () => {
    const places: PlaceResponseDTO[] = [
      { id: 1, type: "CITY", name: "Sant Cugat Sesgarrigues", slug: "sant-cugat-sesgarrigues" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("santcugatsesgarrigues", places)).toBe(
      "sant-cugat-sesgarrigues"
    );
  });

  it("resolves missing stop-word like 'de'", () => {
    const places: PlaceResponseDTO[] = [
      { id: 2, type: "CITY", name: "Sant Pere de Vilamajor", slug: "sant-pere-de-vilamajor" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("sant-pere-vilamajor", places)).toBe(
      "sant-pere-de-vilamajor"
    );
  });

  it("returns null when already canonical", () => {
    const places: PlaceResponseDTO[] = [
      { id: 3, type: "CITY", name: "Vic", slug: "vic" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("vic", places)).toBe(null);
  });

  it("returns null for empty input", () => {
    const places: PlaceResponseDTO[] = [
      { id: 3, type: "CITY", name: "Vic", slug: "vic" },
    ];
    expect(resolvePlaceSlugAliasFromPlaces("", places)).toBe(null);
    expect(resolvePlaceSlugAliasFromPlaces("   ", places)).toBe(null);
  });

  it("handles trim + uppercase input", () => {
    const places: PlaceResponseDTO[] = [
      { id: 1, type: "CITY", name: "Sant Cugat Sesgarrigues", slug: "sant-cugat-sesgarrigues" },
    ];
    expect(resolvePlaceSlugAliasFromPlaces("  SANTCUGATSESgarrigues ", places)).toBe(
      "sant-cugat-sesgarrigues"
    );
  });

  it("returns null when the key is ambiguous (collision)", () => {
    const places: PlaceResponseDTO[] = [
      { id: 1, type: "CITY", name: "A B", slug: "a-b" },
      { id: 2, type: "CITY", name: "AB", slug: "ab" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("ab", places)).toBe(null);
    expect(resolvePlaceSlugAliasFromPlaces("a-b", places)).toBe(null);
  });
});
