import { describe, expect, it } from "vitest";
import { preserveMapViewParam } from "@utils/view-mode";

describe("preserveMapViewParam", () => {
  it("returns targetUrl unchanged when current has no view=map", () => {
    expect(preserveMapViewParam("/catalunya?search=x", "")).toBe(
      "/catalunya?search=x"
    );
    expect(preserveMapViewParam("/catalunya", "?search=x")).toBe("/catalunya");
  });

  it("preserves view=map when current has view=map", () => {
    expect(
      preserveMapViewParam("/catalunya?search=x", "?view=map")
    ).toBe("/catalunya?search=x&view=map");

    expect(preserveMapViewParam("/catalunya", "view=map")).toBe(
      "/catalunya?view=map"
    );
  });

  it("does not overwrite an explicit view param on targetUrl", () => {
    expect(
      preserveMapViewParam("/catalunya?view=list", "?view=map")
    ).toBe("/catalunya?view=list");
  });

  it("preserves hash and existing query params", () => {
    expect(
      preserveMapViewParam("/catalunya?search=x#section", "?view=map")
    ).toBe("/catalunya?search=x&view=map#section");
  });

  it("accepts URLSearchParams", () => {
    const current = new URLSearchParams("view=map&search=y");
    expect(preserveMapViewParam("/catalunya?search=x", current)).toBe(
      "/catalunya?search=x&view=map"
    );
  });
});
