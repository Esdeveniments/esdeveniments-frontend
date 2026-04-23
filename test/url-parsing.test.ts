import { describe, it, expect } from "vitest";
import { extractURLSegments, debugURLParsing } from "../utils/url-parsing";

describe("extractURLSegments", () => {
  it("returns empty object for root path", () => {
    expect(extractURLSegments("/")).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(extractURLSegments("")).toEqual({});
  });

  it("extracts place from single segment", () => {
    expect(extractURLSegments("/barcelona")).toEqual({ place: "barcelona" });
  });

  it("extracts place and date from two segments", () => {
    expect(extractURLSegments("/barcelona/avui")).toEqual({
      place: "barcelona",
      date: "avui",
    });
  });

  it("extracts place, date, and category from three segments", () => {
    expect(extractURLSegments("/barcelona/avui/concerts")).toEqual({
      place: "barcelona",
      date: "avui",
      category: "concerts",
    });
  });

  it("handles more than three segments (takes first 3)", () => {
    expect(extractURLSegments("/a/b/c/d/e")).toEqual({
      place: "a",
      date: "b",
      category: "c",
    });
  });

  it("strips locale prefix /ca/", () => {
    expect(extractURLSegments("/ca/barcelona")).toEqual({
      place: "barcelona",
    });
  });

  it("strips locale prefix /es/ with segments", () => {
    expect(extractURLSegments("/es/barcelona/avui")).toEqual({
      place: "barcelona",
      date: "avui",
    });
  });

  it("strips locale prefix /en/ with full path", () => {
    expect(extractURLSegments("/en/barcelona/avui/concerts")).toEqual({
      place: "barcelona",
      date: "avui",
      category: "concerts",
    });
  });

  it("handles locale-only path /es/ as root", () => {
    expect(extractURLSegments("/es")).toEqual({});
  });

  it("handles trailing slashes", () => {
    expect(extractURLSegments("/barcelona/")).toEqual({
      place: "barcelona",
    });
  });

  it("handles place with hyphens", () => {
    expect(extractURLSegments("/vilassar-de-mar")).toEqual({
      place: "vilassar-de-mar",
    });
  });

  it("handles catalunya path", () => {
    expect(extractURLSegments("/catalunya")).toEqual({
      place: "catalunya",
    });
  });

  it("handles date shortcuts", () => {
    expect(extractURLSegments("/barcelona/cap-de-setmana")).toEqual({
      place: "barcelona",
      date: "cap-de-setmana",
    });
  });
});

describe("debugURLParsing", () => {
  it("does not throw in non-dev environment", () => {
    expect(() =>
      debugURLParsing("/test", { place: "test" }, {})
    ).not.toThrow();
  });
});
