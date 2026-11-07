import { describe, it, expect } from "vitest";
import {
  formatCatalanDe,
  formatNameOf,
  formatNamePrepositionParts,
  formatPlacePreposition,
  formatPlacePrepositionParts,
} from "../utils/string-helpers";
import { getProfileDisplayName } from "../utils/profile-name";

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

describe("place phrases with an article in the name", () => {
  it.each([
    ["El Masnou", "town", "al Masnou", "del Masnou", "des del Masnou"],
    ["Els Prats de Rei", "town", "als Prats de Rei", "dels Prats de Rei", "des dels Prats de Rei"],
    ["La Garriga", "town", "a la Garriga", "de la Garriga", "des de la Garriga"],
    ["Les Cabanyes", "town", "a les Cabanyes", "de les Cabanyes", "des de les Cabanyes"],
    ["L'Escala", "town", "a l'Escala", "de l'Escala", "des de l'Escala"],
    ["Arenys de Mar", "town", "a Arenys de Mar", "d'Arenys de Mar", "des d'Arenys de Mar"],
    ["El Priorat", "region", "al Priorat", "del Priorat", "des del Priorat"],
    ["La Garrotxa", "region", "a la Garrotxa", "de la Garrotxa", "des de la Garrotxa"],
    ["Maresme", "region", "al Maresme", "del Maresme", "des del Maresme"],
    ["Catalunya", "region", "a Catalunya", "de Catalunya", "des de Catalunya"],
    ["Osona", "region", "a Osona", "d'Osona", "des d'Osona"],
    ["Bages", "region", "al Bages", "del Bages", "des del Bages"],
    ["Anoia", "region", "a l'Anoia", "de l'Anoia", "des de l'Anoia"],
    ["L’Ametlla del Vallès", "town", "a l'Ametlla del Vallès", "de l'Ametlla del Vallès", "des de l'Ametlla del Vallès"],
    ["Ellera", "town", "a Ellera", "d'Ellera", "des d'Ellera"],
    ["Lamarca", "town", "a Lamarca", "de Lamarca", "des de Lamarca"],
  ] as const)("contracts %s in Catalan", (name, type, inPhrase, ofPhrase, fromPhrase) => {
    expect(formatPlacePreposition(name, type, "ca", false)).toBe(inPhrase);
    expect(formatPlacePreposition(name, type, "ca", false, "of")).toBe(ofPhrase);
    expect(formatPlacePreposition(name, type, "ca", false, "from")).toBe(fromPhrase);
  });

  it("keeps the article in Spanish and English", () => {
    expect(formatPlacePreposition("El Masnou", "town", "es", false, "of")).toBe("de El Masnou");
    expect(formatPlacePreposition("El Masnou", "town", "es", false, "from")).toBe("desde El Masnou");
    expect(formatPlacePreposition("El Masnou", "town", "en", false, "of")).toBe("of El Masnou");
  });

  it("splits the preposition from the place for split layouts", () => {
    expect(formatPlacePrepositionParts("El Masnou", "town", "ca", false)).toEqual({
      preposition: "al",
      place: "Masnou",
    });
    expect(formatPlacePrepositionParts("L'Escala", "town", "ca", false)).toEqual({
      preposition: "a",
      place: "l'Escala",
    });
    expect(formatPlacePrepositionParts("El Masnou", "town", "es", false)).toEqual({
      preposition: "en",
      place: "El Masnou",
    });
  });
});

describe("formatNameOf", () => {
  it.each([
    ["Ajuntament del Masnou", "de l'Ajuntament del Masnou"],
    ["Museu del Joguet", "del Museu del Joguet"],
    ["Biblioteca Can Fabra", "de la Biblioteca Can Fabra"],
    ["Universitat de Vic", "de la Universitat de Vic"],
    ["Òmnium Cultural", "d'Òmnium Cultural"],
    ["Pau Riba", "de Pau Riba"],
    // A brand's own article doesn't contract
    ["El Temps", "d'El Temps"],
    ["La Vanguardia", "de La Vanguardia"],
    ["Iaia Teatre", "de Iaia Teatre"],
  ])("ca: %s → %s", (name, expected) => {
    expect(formatNameOf(name, "ca")).toBe(expected);
  });

  it.each([
    ["Ajuntament del Masnou", "per", "l'Ajuntament del Masnou"],
    ["Museu del Joguet", "pel", "Museu del Joguet"],
    ["Biblioteca Can Fabra", "per la", "Biblioteca Can Fabra"],
    ["Òmnium Cultural", "per", "Òmnium Cultural"],
  ])("ca by: %s → %s %s", (name, preposition, place) => {
    expect(formatNamePrepositionParts(name, "ca", "by")).toEqual({
      preposition,
      place,
    });
  });

  it("uses plain de/of in Spanish and English", () => {
    expect(formatNameOf("Ajuntament del Masnou", "es")).toBe(
      "de Ajuntament del Masnou"
    );
    expect(formatNameOf("Ajuntament del Masnou", "en")).toBe(
      "of Ajuntament del Masnou"
    );
  });
});

describe("elision before a semivowel", () => {
  it("doesn't elide de before i/u + vowel", () => {
    expect(formatCatalanDe("Huelva", false, false, "town")).toBe("de Huelva");
    expect(formatCatalanDe("Iecla", false, false, "town")).toBe("de Iecla");
    expect(formatCatalanDe("Ullastrell", false, false, "town")).toBe(
      "d'Ullastrell"
    );
    expect(formatCatalanDe("Hostalric", false, false, "town")).toBe(
      "d'Hostalric"
    );
  });
});

describe("getProfileDisplayName", () => {
  it.each([
    ["Ajuntament El Masnou", "Ajuntament del Masnou"],
    ["Ajuntament Les Masies de Voltregà", "Ajuntament de les Masies de Voltregà"],
    ["Ajuntament Òrrius", "Ajuntament d'Òrrius"],
    ["Ajuntament Sora", "Ajuntament de Sora"],
    ["Ajuntament de Premià de Dalt", "Ajuntament de Premià de Dalt"],
    ["Ajuntament d'Arenys de Mar", "Ajuntament d'Arenys de Mar"],
    ["Ajuntament del Masnou", "Ajuntament del Masnou"],
    ["Pau Riba", "Pau Riba"],
  ])("%s → %s", (displayName, expected) => {
    expect(getProfileDisplayName({ displayName })).toBe(expected);
  });

  it("falls back to the legacy name, then the username", () => {
    expect(getProfileDisplayName({ displayName: " ", name: "Anna" })).toBe("Anna");
    expect(getProfileDisplayName({ displayName: null, username: "anna" })).toBe(
      "anna"
    );
    expect(getProfileDisplayName(null)).toBe("");
  });
});
