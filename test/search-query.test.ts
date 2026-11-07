import { describe, it, expect } from "vitest";
import cases from "./fixtures/search-fold-cases.json";
import { foldForSearch } from "../utils/string-helpers";
import {
  buildPlaceSearchIndex,
  hasSearchableToken,
  isWithinOneEdit,
  placeForSearch,
  searchTokens,
  suggestPlaces,
  toProfileSearchQuery,
} from "../utils/search-query";

// Shared with the backend's search_fold tests (esdeveniments-backend#59).
describe("foldForSearch parity fixture", () => {
  it.each(cases.fold)("$input → $expected", ({ input, expected }) => {
    expect(foldForSearch(input)).toBe(expected);
  });

  it("is idempotent", () => {
    for (const { expected } of cases.fold) {
      expect(foldForSearch(expected)).toBe(expected);
    }
  });
});

describe("searchTokens parity fixture", () => {
  it.each(cases.tokens)("$input → $tokens", ({ input, tokens, searchable }) => {
    expect(searchTokens(input)).toEqual(tokens);
    expect(hasSearchableToken(searchTokens(input))).toBe(searchable);
  });
});

describe("toProfileSearchQuery", () => {
  it("sends the folded query, particles included", () => {
    expect(toProfileSearchQuery("L’Auditori")).toBe("l auditori");
    expect(toProfileSearchQuery("  Tàpies  ")).toBe("tapies");
  });

  it("returns null when nothing is searchable", () => {
    expect(toProfileSearchQuery("l'")).toBeNull();
    expect(toProfileSearchQuery("🎉")).toBeNull();
  });

  it("returns null when the folded query is over 100 chars", () => {
    expect(toProfileSearchQuery("ab ".repeat(33) + "a")).toBe(
      ("ab ".repeat(33) + "a").trim(),
    );
    // ß folds to "ss", so 51 of them pass the raw limit but not the folded one.
    expect(toProfileSearchQuery("ß".repeat(51))).toBeNull();
  });
});

describe("isWithinOneEdit", () => {
  it.each([
    ["cardedeu", "cardedeu", true],
    ["csrdedeu", "cardedeu", true],
    ["cardeedu", "cardedeu", true],
    ["cardedu", "cardedeu", true],
    ["carddedeu", "cardedeu", true],
    ["csrdeedu", "cardedeu", false],
    ["cardede", "cardedeux", false],
  ])("%s ~ %s → %s", (a, b, expected) => {
    expect(isWithinOneEdit(a, b)).toBe(expected);
    expect(isWithinOneEdit(b, a)).toBe(expected);
  });
});

describe("suggestPlaces", () => {
  const index = buildPlaceSearchIndex([
    { label: "Castellví de Rosanes", value: "castellvi-de-rosanes" },
    { label: "Castellar del Vallès", value: "castellar-del-valles" },
    { label: "Cardedeu", value: "cardedeu" },
    { label: "Cardedeu", value: "cardedeu" },
    { label: "Sant Cugat del Vallès", value: "sant-cugat-del-valles" },
    { label: "L'Hospitalet de Llobregat", value: "lhospitalet-de-llobregat" },
    { label: "Vallès Oriental", value: "valles-oriental", placeType: "region" },
    { label: "Granollers", value: "granollers" },
    { label: "Calella", value: "calella" },
  ]);
  const labels = (query: string) => suggestPlaces(query, index).map((p) => p.label);

  it("puts the exact name first and dedupes by slug", () => {
    expect(labels("Cardedeu")).toEqual(["Cardedeu"]);
  });

  it("matches a name start, then a word start", () => {
    expect(labels("Castell")).toEqual(["Castellar del Vallès", "Castellví de Rosanes"]);
    expect(labels("cugat")).toEqual(["Sant Cugat del Vallès"]);
    expect(labels("vallès")).toEqual([
      "Vallès Oriental",
      "Castellar del Vallès",
      "Sant Cugat del Vallès",
    ]);
    expect(labels("l’hospitalet")).toEqual(["L'Hospitalet de Llobregat"]);
  });

  it("caps the list", () => {
    expect(suggestPlaces("ca", index)).toHaveLength(3);
    expect(suggestPlaces("ca", index, 1)).toHaveLength(1);
  });

  it("allows one typo only for 5+ chars and only when nothing else matches", () => {
    expect(labels("Csrdedeu")).toEqual(["Cardedeu"]);
    expect(labels("granolers")).toEqual(["Granollers"]);
    expect(labels("cslla")).toEqual([]);
    expect(labels("calela")).toEqual(["Calella"]);
  });

  it("matches a typo against one word of a longer name", () => {
    expect(labels("orientsl")).toEqual(["Vallès Oriental"]);
  });

  it("needs 2+ folded chars", () => {
    expect(labels("c")).toEqual([]);
    expect(labels("🎉")).toEqual([]);
  });
});

describe("placeForSearch", () => {
  const places = [{ label: "Cardedeu", value: "cardedeu" }];
  const cardedeu = { label: "Cardedeu", value: "cardedeu" };

  it("opens a picked place, and an exact name with nothing picked", () => {
    expect(placeForSearch("Csrdedeu", places, { type: "place", id: "place:cardedeu", place: cardedeu })).toEqual(cardedeu);
    expect(placeForSearch("cardedeu", places)).toEqual(cardedeu);
    expect(placeForSearch("Csrdedeu", places)).toBeNull();
  });

  it("keeps a picked text option a text search, even for a place name", () => {
    expect(placeForSearch("Cardedeu", places, { type: "events", id: "events", query: "Cardedeu" })).toBeNull();
  });
});
