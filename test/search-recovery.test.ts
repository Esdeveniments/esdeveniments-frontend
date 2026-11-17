import { describe, it, expect } from "vitest";
import {
  getSearchRecoveryLinks,
  getSuggestedPlaceLinks,
} from "@utils/search-recovery";

const PLACES = [
  { label: "Blanes", value: "blanes" },
  { label: "Cardedeu", value: "cardedeu" },
  { label: "Palafrugell", value: "palafrugell" },
  { label: "Palafolls", value: "palafolls" },
  { label: "Sant Cugat del Vallès", value: "sant-cugat-del-valles" },
  { label: "Vic", value: "vic" },
  { label: "Artés", value: "artes" },
  { label: "La Pera", value: "la-pera" },
  { label: "Forès", value: "fores" },
  { label: "Espot", value: "espot" },
  { label: "La Vansa i Fórnols", value: "la-vansa-i-fornols" },
];

const hrefs = (
  segments: { place: string; date: string; category: string },
  query: Record<string, string>,
) =>
  Object.fromEntries(
    getSearchRecoveryLinks(segments, query).map((l) => [l.action, l.href]),
  );

describe("getSearchRecoveryLinks", () => {
  it("returns nothing when no filter narrows the search", () => {
    expect(
      hrefs({ place: "catalunya", date: "tots", category: "tots" }, { search: "jazz" }),
    ).toEqual({});
  });

  it("widens each active filter on its own and keeps the search", () => {
    expect(
      hrefs(
        { place: "cardedeu", date: "avui", category: "concerts" },
        { search: "jazz" },
      ),
    ).toEqual({
      place: "/catalunya/avui/concerts?search=jazz",
      date: "/cardedeu/concerts?search=jazz",
      category: "/cardedeu/avui?search=jazz",
    });
  });

  it("drops the radius when widening the place", () => {
    const links = hrefs(
      { place: "cardedeu", date: "tots", category: "tots" },
      { search: "jazz", distance: "10", lat: "41.6", lon: "2.3" },
    );
    expect(links.place).toBe("/catalunya?search=jazz");
    expect(links.distance).toBe("/cardedeu?search=jazz");
  });

  it("offers the distance link only when a radius is actually sent", () => {
    // No lat/lon: useEvents sends no radius, so there's nothing to widen.
    expect(
      hrefs({ place: "catalunya", date: "tots", category: "tots" }, { search: "jazz", distance: "10" }),
    ).toEqual({});
  });

  it("clears a calendar range when widening the date", () => {
    expect(
      hrefs(
        { place: "catalunya", date: "tots", category: "tots" },
        { search: "jazz", from: "2026-11-10", to: "2026-11-12" },
      ),
    ).toEqual({ date: "/catalunya?search=jazz" });
  });
});

describe("getSuggestedPlaceLinks", () => {
  it("suggests a 1-edit place typo and builds a canonical place URL without search or radius", () => {
    expect(
      getSuggestedPlaceLinks(
        { place: "catalunya", date: "cap-de-setmana", category: "tots" },
        { search: "blaned", distance: "15", lat: "41.6", lon: "2.7" },
        PLACES,
      ),
    ).toEqual([
      { label: "Blanes", slug: "blanes", href: "/blanes/cap-de-setmana" },
    ]);
  });

  it("suggests 5+ char prefixes and word starts", () => {
    expect(
      getSuggestedPlaceLinks(
        { place: "catalunya", date: "tots", category: "tots" },
        { search: "palaf" },
        PLACES,
      ).map((p) => p.href),
    ).toEqual(["/palafolls", "/palafrugell"]);

    expect(
      getSuggestedPlaceLinks(
        { place: "catalunya", date: "tots", category: "tots" },
        { search: "cugat" },
        PLACES,
      ).map((p) => p.href),
    ).toEqual(["/sant-cugat-del-valles"]);
  });

  it("allows short exact place matches while rejecting short prefixes, category words, and inner-token typos", () => {
    expect(
      getSuggestedPlaceLinks(
        { place: "catalunya", date: "tots", category: "tots" },
        { search: "Vic" },
        PLACES,
      ).map((p) => p.href),
    ).toEqual(["/vic"]);

    for (const term of ["art", "opera", "fires", "esport", "dansa", "jazz"]) {
      expect(
        getSuggestedPlaceLinks(
          { place: "catalunya", date: "tots", category: "tots" },
          { search: term },
          PLACES,
        ),
      ).toEqual([]);
    }
  });
});
