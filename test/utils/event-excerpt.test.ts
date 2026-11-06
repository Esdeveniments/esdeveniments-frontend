import { describe, expect, it } from "vitest";
import { buildEventExcerpt } from "@utils/event-excerpt";
import { NEWS_EVENT_EXCERPT_MAX_LENGTH } from "@utils/constants";

// Real descriptions from a Barcelona weekend article (Nov 2026), cut at 700 chars.
const events = {
  ginesta: {
    title: "Concert \"Ginestà\"",
    description:
      "Ginestà s'ha consolidat com un dels grups imprescindibles del pop català. Els germans Júlia i Pau Serrasolsas van enlluernar de nou amb \"Vida Meva\" (2024), un disc que els va valer dos Premis Enderrock i el reconeixement com a Disc Català de l'Any. El 2025 van desenvolupar l'imaginari del disc publicant l'EP \"Només viure\", confirmant així el seu moment d'esplendor i la seva capacitat per emocionar amb un univers sonor propi i una connexió única amb el sentir del públic català. Amb més de 90 actuacions entre 2024 i 2025, han exhaurit entrades a la sala Apolo i han estat protagonistes de festivals com Porta Ferrada, Cabró Rock, Canet Rock, L'Acústica o La Mercè. El 2026, Ginestà encetarà una n",
  },
  cosesExcepcionals: {
    title: "Les coses excepcionals",
    description:
      "**Les coses excepcionals** – Teatre La Bòbila, Barcelona (8 de novembre de 2026)\n\nUna comèdia íntima i emotiva que explora la depressió i la força de l’amor familiar. El protagonista, un nen de sis anys, viu una situació difícil: la mare es troba a l’hospital i el pare admet haver comès “alguna cosa estúpida”. Incapaç de trobar la felicitat, el nen comença a elaborar una llista de les coses excepcionals que fan que la vida valgui la pena: el gelat, les pel·lícules de Kung‑Fu, cremar coses, riure fins que et surt llet pel nas, les grues de les obres, i fins i tot el coixí on deixa les seves notes. Cada element de la llista cobra vida pròpia, convertint-se en un reflex de la resistència i la e",
  },
  coloniaDelSo: {
    title: "La Colònia del So",
    description:
      "Concert amb orquestra i cor al Pavelló Municipal de Puig‑Reig (Barcelona) el 8 de novembre de 2026. L’esdeveniment, titulat **La Colònia del So**, ofereix una interpretació de les cançons més emblemàtiques del grup Esquirols, acompanyada d’una història original que recorre les lletres i els personatges que van marcar la seva trajectòria.\n\nEsquirols, nascut al poble de l’Esquirol, al cor del Collsacabra (Osona), va ser una veu pionera de la música catalana des de 1969, en una època en què cantar en català representava un veritable repte. El grup va viure la efervescència d’un panorama musical en plena transformació, coincidint amb canvis socials i polítics que van obrir noves esperances per a",
  },
  clementina: {
    title: "Conferència: \"Clementina Arderiu\"",
    description:
      "**Conferència: “Clementina Arderiu”**  \nMuseu d'Història de Catalunya – Barcelona  \n7 de novembre de 2026, 18:30  \n\nAquest any es commemoren cinquanta anys de la mort de Clementina Arderiu, una de les veus més potents de la poesia catalana del segle XX. La seva obra, profundament arrelada en la poesia popular, explora la quotidianitat, la vida interior i la condició femenina, revelant una complexitat sovint subestimada. Tot i ser la parella del poeta Carles Riba, la seva trajectòria ha quedat massa sovint eclipsada per la del seu marit.  \n\nL’Any Clementina Arderiu reivindica la seva figura i, en aquest marc, Sàpiens i Cementiris de Barcelona organitzen una conferència per aprofundir en la se",
  },
  whitacre: {
    title: "Concert \"Eternity in an hour de Whitacre\" amb Cor de Cambra del Palau & Eric Whitacre",
    description:
      "**Concert “Eternity in an hour” d’Eric Whitacre**  \n\nEl 8 de novembre de 2026, el Petit Palau de la Ciutat Vella acollirà una experiència musical única: el Cor de Cambra del Palau de la Música Catalana, dirigit per Xavier Puig, interpretarà l’obra‑mestre d’Eric Whitaker, *Eternity in an hour*. Acompanyat per l’ensamblatge de Whitacre, el concert promet una immersió sonora que combina la delicadesa del cor de cambra amb la intensitat del repertori contemporani.\n\nDestacats solistes són Oriol Prat al violoncel i Jordi Armengol al piano, que aportaran una dimensió íntima i emotiva a la interpretació. La direcció de Whitacre, reconegut mundialment per les seves composicions corals, garanteix una ",
  },
};

describe("buildEventExcerpt", () => {
  it("drops a bold first line that repeats the title, venue and date", () => {
    const { title, description } = events.cosesExcepcionals;
    const excerpt = buildEventExcerpt(description, title);
    expect(excerpt.startsWith("Una comèdia íntima i emotiva")).toBe(true);
    expect(excerpt).not.toContain("**");
    expect(excerpt).not.toContain("Teatre La Bòbila");
  });

  it("keeps a first sentence that only names part of the title", () => {
    const { title, description } = events.ginesta;
    expect(buildEventExcerpt(description, title)).toMatch(
      /^Ginestà s'ha consolidat com un dels grups imprescindibles del pop català\./,
    );
  });

  it("drops a multi-line header block (title, venue, date)", () => {
    const { title, description } = events.clementina;
    expect(buildEventExcerpt(description, title)).toMatch(
      /^Aquest any es commemoren cinquanta anys/,
    );
  });

  it("drops a heading that reuses the title's words in another order", () => {
    const { title, description } = events.whitacre;
    const excerpt = buildEventExcerpt(description, title);
    expect(excerpt).toMatch(/^El 8 de novembre de 2026, el Petit Palau/);
    expect(excerpt).not.toContain("*");
  });

  it("keeps body text that mentions the title in bold", () => {
    const { title, description } = events.coloniaDelSo;
    const excerpt = buildEventExcerpt(description, title);
    expect(excerpt).toMatch(/^Concert amb orquestra i cor al Pavelló Municipal/);
    expect(excerpt).toContain("titulat La Colònia del So, ofereix");
  });

  it("cuts at a word boundary, ends with an ellipsis and collapses whitespace", () => {
    for (const { title, description } of Object.values(events)) {
      const excerpt = buildEventExcerpt(description, title);
      expect(excerpt.length).toBeLessThanOrEqual(NEWS_EVENT_EXCERPT_MAX_LENGTH + 1);
      expect(excerpt.length).toBeGreaterThan(150);
      expect(excerpt.endsWith("…")).toBe(true);
      expect(excerpt).not.toMatch(/\s{2,}|\s…$|[,;:]…$/);
      const lastWord = excerpt.slice(0, -1).split(" ").pop() ?? "";
      expect(description).toContain(lastWord);
    }
  });

  it("keeps a lead sentence or paragraph that names the event", () => {
    expect(
      buildEventExcerpt(
        "La Fira de Sant Andreu torna aquest cap de setmana amb més de 100 parades. Hi haurà música.",
        "Fira de Sant Andreu",
      ),
    ).toMatch(/^La Fira de Sant Andreu torna/);
    expect(
      buildEventExcerpt(
        "El Concert de Nadal de l'Orfeó omplirà l'església.\n\nEntrada lliure.",
        "Concert de Nadal",
      ),
    ).toMatch(/^El Concert de Nadal de l'Orfeó/);
    expect(
      buildEventExcerpt("Castanyada popular a la plaça Major. Organitza l'Ajuntament.", "Castanyada"),
    ).toMatch(/^Castanyada popular/);
  });

  it("strips HTML, entities and markdown links", () => {
    expect(
      buildEventExcerpt(
        "<p><strong>Fira</strong> de Nadal &amp; mercat</p><p>Visita la [web](https://example.com).</p>",
        "Concert de Sant Esteve",
      ),
    ).toBe("Fira de Nadal & mercat Visita la web.");
  });

  it("returns short text as is and empty input as an empty string", () => {
    expect(buildEventExcerpt("Una nit de jazz.", "Jazz al parc")).toBe("Una nit de jazz.");
    expect(buildEventExcerpt(null, "Jazz al parc")).toBe("");
  });
});
