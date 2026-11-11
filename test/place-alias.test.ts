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

  it("resolves leading Catalan and Aranese articles in both directions without breaking Les", () => {
    const places: PlaceResponseDTO[] = [
      { id: 31, type: "REGION", name: "Alt Urgell", slug: "alt-urgell" },
      { id: 1, type: "REGION", name: "Alt Empordà", slug: "alt-emporda" },
      { id: 3, type: "REGION", name: "Garrotxa", slug: "garrotxa" },
      { id: 41, type: "REGION", name: "Baix Ebre", slug: "baix-ebre" },
      { id: 32, type: "REGION", name: "Garrigues", slug: "garrigues" },
      { id: 18, type: "REGION", name: "Conca de Barberà", slug: "conca-de-barbera" },
      { id: 20, type: "REGION", name: "Priorat", slug: "priorat" },
      { id: 177, type: "CITY", name: "L'Hospitalet de Llobregat", slug: "l-hospitalet-de-llobregat" },
      { id: 312, type: "CITY", name: "Es Bòrdes", slug: "es-bordes" },
      { id: 314, type: "CITY", name: "Les", slug: "les" },
      { id: 801, type: "CITY", name: "Les Borges Blanques", slug: "les-borges-blanques" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("l-alt-urgell", places)).toBe("alt-urgell");
    expect(resolvePlaceSlugAliasFromPlaces("l-alt-emporda", places)).toBe("alt-emporda");
    expect(resolvePlaceSlugAliasFromPlaces("la-garrotxa", places)).toBe("garrotxa");
    expect(resolvePlaceSlugAliasFromPlaces("el-baix-ebre", places)).toBe("baix-ebre");
    expect(resolvePlaceSlugAliasFromPlaces("les-garrigues", places)).toBe("garrigues");
    expect(resolvePlaceSlugAliasFromPlaces("la-conca-de-barbera", places)).toBe(
      "conca-de-barbera"
    );
    expect(resolvePlaceSlugAliasFromPlaces("el-priorat", places)).toBe("priorat");
    expect(resolvePlaceSlugAliasFromPlaces("hospitalet-de-llobregat", places)).toBe(
      "l-hospitalet-de-llobregat"
    );
    expect(resolvePlaceSlugAliasFromPlaces("lhospitalet-de-llobregat", places)).toBe(
      "l-hospitalet-de-llobregat"
    );
    expect(resolvePlaceSlugAliasFromPlaces("borges-blanques", places)).toBe(
      "les-borges-blanques"
    );
    expect(resolvePlaceSlugAliasFromPlaces("les", places)).toBe(null);
  });

  it("redirects all 18 legacy article-prefixed comarca slugs to their article-less canonical slugs", () => {
    const legacyToCanonical: [string, string, string][] = [
      ["la-garrotxa", "Garrotxa", "garrotxa"],
      ["la-selva", "Selva", "selva"],
      ["la-conca-de-barbera", "Conca de Barberà", "conca-de-barbera"],
      ["el-priorat", "Priorat", "priorat"],
      ["la-noguera", "Noguera", "noguera"],
      ["l-urgell", "Urgell", "urgell"],
      ["l-alt-urgell", "Alt Urgell", "alt-urgell"],
      ["les-garrigues", "Garrigues", "garrigues"],
      ["la-segarra", "Segarra", "segarra"],
      ["el-solsones", "Solsonès", "solsones"],
      ["la-cerdanya", "Cerdanya", "cerdanya"],
      ["el-pallars-jussa", "Pallars Jussà", "pallars-jussa"],
      ["el-pallars-sobira", "Pallars Sobirà", "pallars-sobira"],
      ["l-alta-ribagorca", "Alta Ribagorça", "alta-ribagorca"],
      ["el-montsia", "Montsià", "montsia"],
      ["el-baix-ebre", "Baix Ebre", "baix-ebre"],
      ["la-ribera-d-ebre", "Ribera d'Ebre", "ribera-d-ebre"],
      ["la-terra-alta", "Terra Alta", "terra-alta"],
    ];

    const places: PlaceResponseDTO[] = legacyToCanonical.map(
      ([, name, slug], idx) => ({
        id: idx + 1,
        type: "REGION",
        name,
        slug,
      })
    );

    for (const [legacySlug, , canonicalSlug] of legacyToCanonical) {
      expect(resolvePlaceSlugAliasFromPlaces(legacySlug, places)).toBe(
        canonicalSlug
      );
      expect(resolvePlaceSlugAliasFromPlaces(canonicalSlug, places)).toBeNull();
    }
  });

  it("resolves official Catalan municipal renames and Val d'Aran variants", () => {
    const places: PlaceResponseDTO[] = [
      { id: 39, type: "REGION", name: "Aran", slug: "aran" },
      { id: 312, type: "CITY", name: "Es Bòrdes", slug: "es-bordes" },
      { id: 904, type: "CITY", name: "Torrebesses", slug: "torrebesses" },
      { id: 480, type: "CITY", name: "La Ràpita", slug: "la-rapita" },
      {
        id: 368,
        type: "CITY",
        name: "Castell d'Aro, Platja d'Aro i s'Agaró",
        slug: "castell-d-aro-platja-d-aro-i-s-agaro",
      },
      { id: 174, type: "CITY", name: "Bigues i Riells", slug: "bigues-i-riells" },
      { id: 38, type: "CITY", name: "Palamós", slug: "palamos" },
    ];

    expect(resolvePlaceSlugAliasFromPlaces("val-d-aran", places)).toBe("aran");
    expect(resolvePlaceSlugAliasFromPlaces("vall-d-aran", places)).toBe("aran");
    expect(resolvePlaceSlugAliasFromPlaces("bordes-es", places)).toBe("es-bordes");
    expect(resolvePlaceSlugAliasFromPlaces("torrebeses", places)).toBe("torrebesses");
    expect(resolvePlaceSlugAliasFromPlaces("sant-carles-de-la-rapita", places)).toBe(
      "la-rapita"
    );
    expect(resolvePlaceSlugAliasFromPlaces("platja-d-aro", places)).toBe(
      "castell-d-aro-platja-d-aro-i-s-agaro"
    );
    expect(resolvePlaceSlugAliasFromPlaces("bigues-i-riells-del-fai", places)).toBe(
      "bigues-i-riells"
    );
    expect(resolvePlaceSlugAliasFromPlaces("palamos-i-sant-joan", places)).toBe("palamos");
  });
});
