import { describe, expect, it } from "vitest";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { FestaMajorAct } from "types/festa-major";
import {
  consolidateKeys,
  extractFestaName,
  isFestaMajorTitle,
} from "@utils/festa-major-name";
import {
  dedupeActs,
  groupEditions,
  mainEdition,
  pickYear,
  summarizeEdition,
  toFestaMajorAct,
} from "@utils/festa-major";

let nextId = 0;
const act = (
  title: string,
  startDate: string,
  extra: Partial<FestaMajorAct> = {},
): FestaMajorAct => ({
  id: String(++nextId),
  slug: `act-${nextId}`,
  title,
  startDate,
  startTime: null,
  endDate: startDate,
  endTime: null,
  location: "",
  ...extra,
});

describe("extractFestaName", () => {
  it.each([
    [
      "Festa major Sant Roc: concert",
      "Malgrat de Mar",
      "sant-roc",
      "Festa Major de Sant Roc",
    ],
    [
      "Correfoc - Festa Major del Gòtic de Barcelona",
      "Barcelona",
      "gotic",
      "Festa Major del Gòtic",
    ],
    [
      "Festa Major de la Marina",
      "Barcelona",
      "marina",
      "Festa Major de la Marina",
    ],
    ["Festa Major d’Hivern - Ball", "Begues", "hivern", "Festa Major d'Hivern"],
    ["Festa Major Petita: sardanes", "Begues", "petita", "Festa Major Petita"],
    [
      "Festa Major de Sant Esteve del Coll",
      "Llinars del Vallès",
      "sant-esteve-del-coll",
      "Festa Major de Sant Esteve del Coll",
    ],
    [
      "Festa Major de River Park 2025 - Havaneres",
      "Pont de Vilomara",
      "river-park",
      "Festa Major de River Park",
    ],
    [
      "FESTA MAJOR Sant Andreu",
      "Sant Pol",
      "sant-andreu",
      "Festa Major de Sant Andreu",
    ],
    ["Festa Major Horta", "Barcelona", "horta", "Festa Major d'Horta"],
    [
      '"Festa Major Font d\'en Fargues"',
      "Barcelona",
      "font-d-en-fargues",
      "Festa Major de Font d'en Fargues",
    ],
    [
      "Festa Major de Ca n'Olivella",
      "Olesa de Bonesvalls",
      "ca-n-olivella",
      "Festa Major de Ca n'Olivella",
    ],
    [
      "Festa Major de St. Salvador",
      "El Brull",
      "sant-salvador",
      "Festa Major de Sant Salvador",
    ],
  ])("%s → %s", (title, town, key, label) => {
    expect(extractFestaName(title, town)).toEqual({ key, label });
  });

  it.each([
    ["Festa Major 2026 - Pregó", "Pont de Vilomara"],
    ["Festa Major - Concert", "Begues"],
    ["Festa Major: programa", "Begues"],
    ["Concert de Festa Major", "Barcelona"],
    ["Dates de festa major", "Barcelona"],
    ["La Mercè - Festa Major de Barcelona", "Barcelona"],
    ["Festa Major de maig de Rocafort", "Pont de Vilomara"],
    ["Festa Major del Masnou", "El Masnou"],
    ["Festa Major de l'Hospitalet", "L'Hospitalet de Llobregat"],
    ["Festa Major de Sant Quirze", "Sant Quirze del Vallès"],
    ["Festa Major Jove de Begues", "Begues"],
    ["Festa Major Infantil", "Begues"],
    ["4a Festa Major Musical de la Coral de Sant Medir 2026", "Barcelona"],
    ["Festa Majorca", "Begues"],
    ["Festa Major de Sant Joan Concert Banda Municipal Gran", "Begues"],
    ["Pregó de festa major a Sant Pol", "Sant Pol"],
    ["FESTA MAJOR Concert d'Estoparte", "Taradell"],
    ["Festa Major de Sèniors", "Caldes d'Estrac"],
  ])("%s is the town's own festa", (title, town) => {
    expect(extractFestaName(title, town)).toEqual({ key: "", label: null });
  });

  it("ignores accents before the term", () => {
    expect(
      extractFestaName("Pregó i cercavila · Festa Major de Gràcia", "Barcelona")
        .key,
    ).toBe("gracia");
  });
});

describe("isFestaMajorTitle", () => {
  it("matches the term in any case", () => {
    expect(isFestaMajorTitle("Pregó de FESTA MAJOR")).toBe(true);
    expect(isFestaMajorTitle("Festes de tardor")).toBe(false);
  });
});

describe("consolidateKeys", () => {
  it("folds keys that extend a shorter one", () => {
    const map = consolidateKeys([
      "sant-roc",
      "sant-roc-concert",
      "sant-nicolau",
      "",
    ]);
    expect(map.get("sant-roc-concert")).toBe("sant-roc");
    expect(map.get("sant-nicolau")).toBe("sant-nicolau");
    expect(map.has("")).toBe(false);
  });
});

describe("toFestaMajorAct", () => {
  const base = {
    id: "abc",
    slug: "pregó",
    title: "Festa Major: Rock &amp; Roll",
    startDate: "2026-08-15",
    startTime: "22:00",
    endDate: "2026-08-14",
    endTime: null,
    location: "Plaça",
  } as EventSummaryResponseDTO;

  it("decodes entities and fixes an end before the start", () => {
    expect(toFestaMajorAct(base)).toMatchObject({
      title: "Festa Major: Rock & Roll",
      endDate: "2026-08-15",
    });
  });

  it("keeps only the venue, without the town and region", () => {
    const placed = {
      ...base,
      city: { name: "Cardedeu" },
      region: { name: "Vallès Oriental" },
    } as EventSummaryResponseDTO;
    expect(
      toFestaMajorAct({
        ...placed,
        location: "Plaça de la Creu, Cardedeu, Vallès Oriental",
      })?.location,
    ).toBe("Plaça de la Creu");
    expect(
      toFestaMajorAct({ ...placed, location: "Cardedeu, Cardedeu, Vallès Oriental" })
        ?.location,
    ).toBe("");
  });

  it("drops events without a date or slug", () => {
    expect(toFestaMajorAct({ ...base, startDate: "" })).toBeNull();
    expect(toFestaMajorAct({ ...base, slug: "" })).toBeNull();
  });

  it("keeps the image only when there is one", () => {
    expect(
      toFestaMajorAct({ ...base, imageUrl: "https://x/a.jpg" }),
    ).toMatchObject({
      imageUrl: "https://x/a.jpg",
    });
    expect(toFestaMajorAct({ ...base, imageUrl: "  " })).not.toHaveProperty(
      "imageUrl",
    );
  });
});

describe("summarizeEdition", () => {
  it("takes the first act's image and drops the acts", () => {
    const edition = {
      key: "",
      label: null,
      start: "2026-08-14",
      end: "2026-08-16",
      acts: [
        act("Pregó", "2026-08-14"),
        act("Concert", "2026-08-15", { imageUrl: "https://x/poster.jpg" }),
        act("Correfoc", "2026-08-16", { imageUrl: "https://x/other.jpg" }),
      ],
    };
    expect(summarizeEdition(edition)).toEqual({
      key: "",
      label: null,
      start: "2026-08-14",
      end: "2026-08-16",
      count: 3,
      imageUrl: "https://x/poster.jpg",
    });
    expect(
      summarizeEdition({ ...edition, acts: [act("Pregó", "2026-08-14")] }),
    ).not.toHaveProperty("imageUrl");
  });
});

describe("dedupeActs", () => {
  it("drops repeated ids and the same title at the same start", () => {
    const a = act("Pregó", "2026-08-14", { startTime: "20:00" });
    const sameId = { ...a, title: "Other" };
    const scrapedTwice = act("PREGÓ", "2026-08-14", { startTime: "20:00" });
    const otherDay = act("Pregó", "2026-08-15", { startTime: "20:00" });
    expect(dedupeActs([a, sameId, scrapedTwice, otherDay])).toEqual([
      a,
      otherDay,
    ]);
  });
});

describe("groupEditions", () => {
  it("separates two named festes of one town", () => {
    const editions = groupEditions(
      [
        act("Festa major Sant Roc: pregó", "2026-08-14"),
        act("Festa major Sant Roc: concert", "2026-08-16"),
        act("Festa major Sant Nicolau: missa", "2026-12-06"),
      ],
      "Malgrat de Mar",
    );
    expect(editions.map((e) => [e.key, e.start, e.end, e.acts.length])).toEqual(
      [
        ["sant-roc", "2026-08-14", "2026-08-16", 2],
        ["sant-nicolau", "2026-12-06", "2026-12-06", 1],
      ],
    );
  });

  it("puts unnamed acts in the one named festa that covers their date", () => {
    const editions = groupEditions(
      [
        act("Festa Major de Gràcia: pregó", "2026-08-15"),
        act("Festa Major de Gràcia: castells", "2026-08-21"),
        act("Concert de Festa Major", "2026-08-18"),
      ],
      "Barcelona",
    );
    expect(editions).toHaveLength(1);
    expect(editions[0].acts).toHaveLength(3);
  });

  it("keeps unnamed acts apart when two named festes overlap", () => {
    const editions = groupEditions(
      [
        act("Festa Major de Gràcia: pregó", "2026-08-15"),
        act("Festa Major de Gràcia: castells", "2026-08-21"),
        act("Festa Major de Sants: pregó", "2026-08-20"),
        act("Festa Major de Sants: correfoc", "2026-08-26"),
        act("Dates de festa major", "2026-08-20"),
      ],
      "Barcelona",
    );
    expect(editions.map((e) => e.key).sort()).toEqual(["", "gracia", "sants"]);
  });

  it("splits unnamed acts far apart in time", () => {
    const editions = groupEditions(
      [
        act("Festa Major - Pregó", "2026-01-17"),
        act("Festa Major - Concert", "2026-07-10"),
        act("Festa Major - Ball", "2026-07-12"),
      ],
      "Begues",
    );
    expect(editions.map((e) => [e.key, e.start, e.acts.length])).toEqual([
      ["", "2026-01-17", 1],
      ["", "2026-07-10", 2],
    ]);
    expect(mainEdition(editions)?.start).toBe("2026-07-10");
  });

  it("doesn't chain a city's unnamed acts into a festa of months", () => {
    const dates = [
      "08-14",
      "08-22",
      "09-04",
      "09-16",
      "10-02",
      "10-12",
      "10-17",
    ];
    const editions = groupEditions(
      [
        ...dates.map((d) => act("Concert de Festa Major", `2026-${d}`)),
        act("Dates de festa major", "2026-10-30"),
        act("Festa Major Alternativa", "2026-11-12", { endDate: "2026-11-15" }),
      ],
      "Barcelona",
    );
    expect(editions.map((e) => [e.start, e.end])).toEqual([
      ["2026-08-14", "2026-09-04"],
      ["2026-09-16", "2026-09-16"],
      ["2026-10-02", "2026-10-30"],
      ["2026-11-12", "2026-11-15"],
    ]);
  });

  it("doesn't stretch a festa with a long exhibition", () => {
    const [edition] = groupEditions(
      [
        act("Festa Major: exposició", "2026-07-01", { endDate: "2026-09-30" }),
        act("Festa Major: pregó", "2026-07-03"),
      ],
      "Begues",
    );
    expect(edition.end).toBe("2026-07-03");
  });

  it("returns nothing for no acts", () => {
    expect(groupEditions([], "Begues")).toEqual([]);
    expect(mainEdition([])).toBeNull();
  });
});

describe("pickYear", () => {
  it.each([
    [0, 30, 2026],
    [2, 30, 2026],
    [5, 30, 2027],
    [2, 2, 2027],
    [1, 0, 2027],
    [0, 0, 2027],
  ])("%i acts this year, %i last year → %i", (current, previous, year) => {
    expect(pickYear(2027, current, previous)).toEqual({
      currentYear: 2027,
      year,
      isCurrentYear: year === 2027,
    });
  });
});
