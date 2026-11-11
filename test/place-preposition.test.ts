import { describe, it, expect } from "vitest";
import {
  contractCatalanPlaceInText,
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
    ["Conca de Barberà", "region", "a la Conca de Barberà", "de la Conca de Barberà", "des de la Conca de Barberà"],
    ["Ribera d'Ebre", "region", "a la Ribera d'Ebre", "de la Ribera d'Ebre", "des de la Ribera d'Ebre"],
    ["Val d'Aran", "region", "a la Val d'Aran", "de la Val d'Aran", "des de la Val d'Aran"],
    ["Aran", "region", "a l'Aran", "de l'Aran", "des de l'Aran"],
    ["Es Bòrdes", "town", "a Es Bòrdes", "d'Es Bòrdes", "des d'Es Bòrdes"],
    ["L’Ametlla del Vallès", "town", "a l'Ametlla del Vallès", "de l'Ametlla del Vallès", "des de l'Ametlla del Vallès"],
    ["Ellera", "town", "a Ellera", "d'Ellera", "des d'Ellera"],
    ["Lamarca", "town", "a Lamarca", "de Lamarca", "des de Lamarca"],
    ["Camp de Tarragona", "region", "al Camp de Tarragona", "del Camp de Tarragona", "des del Camp de Tarragona"],
  ] as const)("contracts %s in Catalan", (name, type, inPhrase, ofPhrase, fromPhrase) => {
    expect(formatPlacePreposition(name, type, "ca", false)).toBe(inPhrase);
    expect(formatPlacePreposition(name, type, "ca", false, "of")).toBe(ofPhrase);
    expect(formatPlacePreposition(name, type, "ca", false, "from")).toBe(fromPhrase);
  });

  it.each([
    ["Alt Camp", "a l'Alt Camp", "de l'Alt Camp"],
    ["Alt Empordà", "a l'Alt Empordà", "de l'Alt Empordà"],
    ["Alt Penedès", "a l'Alt Penedès", "de l'Alt Penedès"],
    ["Alt Urgell", "a l'Alt Urgell", "de l'Alt Urgell"],
    ["Alta Ribagorça", "a l'Alta Ribagorça", "de l'Alta Ribagorça"],
    ["Anoia", "a l'Anoia", "de l'Anoia"],
    ["Aran", "a l'Aran", "de l'Aran"],
    ["Bages", "al Bages", "del Bages"],
    ["Baix Camp", "al Baix Camp", "del Baix Camp"],
    ["Baix Ebre", "al Baix Ebre", "del Baix Ebre"],
    ["Baix Empordà", "al Baix Empordà", "del Baix Empordà"],
    ["Baix Llobregat", "al Baix Llobregat", "del Baix Llobregat"],
    ["Baix Penedès", "al Baix Penedès", "del Baix Penedès"],
    ["Barcelonès", "al Barcelonès", "del Barcelonès"],
    ["Berguedà", "al Berguedà", "del Berguedà"],
    ["Cerdanya", "a la Cerdanya", "de la Cerdanya"],
    ["Conca de Barberà", "a la Conca de Barberà", "de la Conca de Barberà"],
    ["Garraf", "al Garraf", "del Garraf"],
    ["Garrigues", "a les Garrigues", "de les Garrigues"],
    ["Garrotxa", "a la Garrotxa", "de la Garrotxa"],
    ["Gironès", "al Gironès", "del Gironès"],
    ["Lluçanès", "al Lluçanès", "del Lluçanès"],
    ["Maresme", "al Maresme", "del Maresme"],
    ["Moianès", "al Moianès", "del Moianès"],
    ["Montsià", "al Montsià", "del Montsià"],
    ["Noguera", "a la Noguera", "de la Noguera"],
    ["Osona", "a Osona", "d'Osona"],
    ["Pallars Jussà", "al Pallars Jussà", "del Pallars Jussà"],
    ["Pallars Sobirà", "al Pallars Sobirà", "del Pallars Sobirà"],
    ["Pla d'Urgell", "al Pla d'Urgell", "del Pla d'Urgell"],
    ["Pla de l'Estany", "al Pla de l'Estany", "del Pla de l'Estany"],
    ["Priorat", "al Priorat", "del Priorat"],
    ["Ribera d'Ebre", "a la Ribera d'Ebre", "de la Ribera d'Ebre"],
    ["Ripollès", "al Ripollès", "del Ripollès"],
    ["Segarra", "a la Segarra", "de la Segarra"],
    ["Segrià", "al Segrià", "del Segrià"],
    ["Selva", "a la Selva", "de la Selva"],
    ["Solsonès", "al Solsonès", "del Solsonès"],
    ["Tarragonès", "al Tarragonès", "del Tarragonès"],
    ["Terra Alta", "a la Terra Alta", "de la Terra Alta"],
    ["Urgell", "a l'Urgell", "de l'Urgell"],
    ["Vallès Occidental", "al Vallès Occidental", "del Vallès Occidental"],
    ["Vallès Oriental", "al Vallès Oriental", "del Vallès Oriental"],
  ] as const)("formats all 43 official Catalan comarques normatively: %s", (comarca, inPhrase, ofPhrase) => {
    expect(formatPlacePreposition(comarca, "region", "ca", false)).toBe(inPhrase);
    expect(formatPlacePreposition(comarca, "region", "ca", false, "of")).toBe(ofPhrase);
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

describe("contractCatalanPlaceInText", () => {
  it.each([
    ["Què fer la setmana del 9 al 13 de novembre a El Masnou", "El Masnou", "Què fer la setmana del 9 al 13 de novembre al Masnou"],
    ["A El Masnou, del 9 al 13 de novembre, hi trobaràs", "El Masnou", "Al Masnou, del 9 al 13 de novembre, hi trobaràs"],
    ["Cap de setmana al poble de La Garriga, a La Garriga.", "La Garriga", "Cap de setmana al poble de la Garriga, a la Garriga."],
    ["Plans a Els Prats de Rei", "Els Prats de Rei", "Plans als Prats de Rei"],
    ["Plans a L’Escala i de L'Escala", "L'Escala", "Plans a l'Escala i de l'Escala"],
  ])("%s", (text, place, expected) => {
    expect(contractCatalanPlaceInText(text, place)).toBe(expected);
  });

  it("leaves other text alone", () => {
    expect(contractCatalanPlaceInText("El Masnou acull la fira", "El Masnou")).toBe(
      "El Masnou acull la fira"
    );
    expect(contractCatalanPlaceInText("Plans a El Masnoui", "El Masnou")).toBe(
      "Plans a El Masnoui"
    );
    expect(contractCatalanPlaceInText("CAVALCADA A EL MASNOU", "El Masnou")).toBe(
      "CAVALCADA A EL MASNOU"
    );
    expect(contractCatalanPlaceInText("Plans a Mataró", "Mataró")).toBe("Plans a Mataró");
    expect(contractCatalanPlaceInText("Plans a El Masnou", undefined)).toBe(
      "Plans a El Masnou"
    );
  });
});
