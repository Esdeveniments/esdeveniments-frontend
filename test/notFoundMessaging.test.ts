import { describe, it, expect } from "vitest";
import { appendSearchQuery } from "@utils/notFoundMessaging";

describe("appendSearchQuery", () => {
  it("avoids duplicating the search snippet when already present", () => {
    const baseText =
      "Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment.";
    const once = appendSearchQuery(baseText, "castellers");
    const twice = appendSearchQuery(once, "castellers");

    expect(twice).toBe(once);
  });

  it("appends snippet when the base text has no period", () => {
    const baseText = "Sense esdeveniments disponibles";
    const augmented = appendSearchQuery(baseText, "concerts");

    expect(augmented).toBe(
      `Sense esdeveniments disponibles per a la cerca "concerts".`
    );
  });
});
