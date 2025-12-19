import { describe, it, expect } from "vitest";
import { formatPlacePreposition } from "../utils/string-helpers";

describe("formatPlacePreposition", () => {
  it("uses Catalan a/al forms for ca locale", () => {
    expect(formatPlacePreposition("Barcelona", "town", "ca", false)).toBe(
      "a Barcelona"
    );
  });

  it("uses 'in' for English locale", () => {
    expect(formatPlacePreposition("Barcelona", "town", "en", false)).toBe(
      "in Barcelona"
    );
  });

  it("uses 'en' for Spanish locale", () => {
    expect(formatPlacePreposition("Barcelona", "town", "es", false)).toBe(
      "en Barcelona"
    );
  });
});
