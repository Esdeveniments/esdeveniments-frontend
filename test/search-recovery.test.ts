import { describe, it, expect } from "vitest";
import { getSearchRecoveryLinks } from "@utils/search-recovery";

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
