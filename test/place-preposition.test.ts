import { describe, it, expect } from "vitest";
import { formatPlacePreposition } from "../utils/string-helpers";

describe("formatPlacePreposition", () => {
  it("uses Catalan a/al forms for ca locale", () => {
    expect(formatPlacePreposition("Barcelona", "town", "ca", false)).toBe(
      "a Barcelona"
    );
  });

  it("contracts 'a + El' to 'al' for Catalan towns", () => {
    // El Masnou → al Masnou (contraction: a + El = al)
    expect(formatPlacePreposition("El Masnou", "town", "ca", false)).toBe(
      "al Masnou"
    );
    expect(formatPlacePreposition("El Prat de Llobregat", "town", "ca", false)).toBe(
      "al Prat de Llobregat"
    );
  });

  it("uses 'a la' for Catalan towns starting with 'La'", () => {
    // La Granada → a la Granada (feminine article)
    expect(formatPlacePreposition("La Granada", "town", "ca", false)).toBe(
      "a la Granada"
    );
    expect(formatPlacePreposition("La Garriga", "town", "ca", false)).toBe(
      "a la Garriga"
    );
  });

  it("lowercases town names when lowercase=true", () => {
    expect(formatPlacePreposition("El Masnou", "town", "ca", true)).toBe(
      "al masnou"
    );
    expect(formatPlacePreposition("La Granada", "town", "ca", true)).toBe(
      "a la granada"
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
