import { describe, it, expect } from "vitest";

import { MAX_FAVORITES } from "@utils/constants";
import { parseFavoritesCookie } from "@utils/favorites";

describe("favorites cookie parsing", () => {
  it("returns [] when cookie is missing", () => {
    expect(parseFavoritesCookie(undefined)).toEqual([]);
    expect(parseFavoritesCookie("")).toEqual([]);
  });

  it("returns [] for invalid JSON", () => {
    expect(parseFavoritesCookie("not-json")).toEqual([]);
  });

  it("returns [] when JSON is not an array", () => {
    expect(parseFavoritesCookie(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseFavoritesCookie(JSON.stringify("slug"))).toEqual([]);
    expect(parseFavoritesCookie(JSON.stringify(null))).toEqual([]);
    expect(parseFavoritesCookie(JSON.stringify(123))).toEqual([]);
  });

  it("filters to strings, trims, removes empties", () => {
    const raw = JSON.stringify([" a ", "", "   ", 123, null, "b"]);
    expect(parseFavoritesCookie(raw)).toEqual(["a", "b"]);
  });

  it("caps to MAX_FAVORITES", () => {
    const values = Array.from(
      { length: MAX_FAVORITES + 10 },
      (_, i) => `slug-${i}`
    );
    const parsed = parseFavoritesCookie(JSON.stringify(values));
    expect(parsed).toHaveLength(MAX_FAVORITES);
    expect(parsed[0]).toBe("slug-0");
    expect(parsed[MAX_FAVORITES - 1]).toBe(`slug-${MAX_FAVORITES - 1}`);
  });
});
