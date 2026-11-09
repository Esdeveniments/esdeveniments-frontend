import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { FestivityListItem } from "types/festivity";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import { fetchAllEventPagesExternal } from "@lib/api/events-external";
import {
  buildFestivityPageData,
  festivitiesForTitle,
  festivityPathsFor,
  getFestivityType,
  indexableFestivityPaths,
  isInFestivitySeason,
  seasonYearOf,
  selectSeasonEvents,
} from "@utils/festivity";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));

const slugsFor = (title: string) =>
  festivitiesForTitle(title).map((type) => type.slug);

describe("festivity matching (real titles)", () => {
  it.each([
    "Fira de Nadal 2025",
    "Nadal Alella -Fira de Nadal i activitats nadalenques",
    "3r Mercat artesà de Nadal del Club Esportiu Can Rafel",
    "Festes nadalenques 2025 - Mercat de Santa Llúcia per la Marató de TV3",
    "Fira de pessebres i ornaments",
    "FIRA DE SANTA LLUCIA",
    "Mercat nadalenc",
  ])("%s is a fira de Nadal", (title) => {
    expect(slugsFor(title)).toEqual(["fires-de-nadal"]);
  });

  it.each([
    "54è Pessebre Vivent d’Osona",
    "PESSEBRE VIVENT Sant Pere",
    "Festes nadalenques 2025 - Pessebre vivent a Rocafort",
    "Pessebres vivents de Catalunya",
  ])("%s is a pessebre vivent", (title) => {
    expect(slugsFor(title)).toEqual(["pessebres-vivents"]);
  });

  it.each([
    "Cavalcada de Reis",
    "Cavalcada de SS.MM. els Reis Mags",
    "Arribada dels Reis d'Orient i cavalcada",
    "Cavalcada de Ses Majestats els Reis d'Orient acompanyats pels emissaris i els patges",
  ])("%s is a cavalcada de Reis", (title) => {
    expect(slugsFor(title)).toEqual(["cavalcades-de-reis"]);
  });

  it.each([
    "Nadal al mercat setmanal",
    "Concert de Nadal",
    "Rafa Nadal, l'exposició",
    "Inscripcions Fira Santa Llúcia 2025",
    "RECOLLIDA DELS REGALS QUE SERAN LLIURATS EL DIA DE LA CAVALCADA DE REIS",
    "Carta als Reis",
    "Arribada del Patge Reial",
    "Cavalcada de Carnaval",
    "Concurs de pessebres",
    "Fira de Sant Ponç",
  ])("%s is none", (title) => {
    expect(slugsFor(title)).toEqual([]);
  });

  it("gives every matching page for IndexNow, once", () => {
    expect(
      festivityPathsFor([
        { title: "Fira de Nadal i pessebre vivent" },
        { title: "Fira de Nadal" },
        { title: "Concert" },
        null,
      ]),
    ).toEqual(["/fires-de-nadal", "/pessebres-vivents"]);
  });
});

describe("seasonYearOf", () => {
  it.each([
    ["2026-11-08", 2026],
    ["2026-12-31", 2026],
    ["2027-01-06", 2026],
    ["2027-01-10", 2026],
    ["2027-01-11", 2027],
    ["2027-06-15", 2027],
    ["2027-10-31", 2027],
  ])("%s belongs to the season starting in %i", (date, year) => {
    expect(seasonYearOf(date)).toBe(year);
  });
});

describe("isInFestivitySeason", () => {
  it.each([
    ["2026-10-31", false],
    ["2026-11-01", true],
    ["2026-12-25", true],
    ["2027-01-10", true],
    ["2027-01-11", false],
    ["2027-07-15", false],
  ])("%s → %s", (date, inSeason) => {
    expect(isInFestivitySeason(date)).toBe(inSeason);
  });
});

let nextId = 0;
const event = (
  title: string,
  startDate: string,
  town = "cardedeu",
  endDate = startDate,
): EventSummaryResponseDTO =>
  ({
    id: ++nextId,
    slug: `event-${nextId}`,
    title,
    startDate,
    endDate,
    startTime: null,
    endTime: null,
    location: "",
    city: { slug: town, name: town },
    region: { slug: "valles-oriental", name: "Vallès Oriental" },
  }) as unknown as EventSummaryResponseDTO;

const fires = getFestivityType("fires-de-nadal");

describe("selectSeasonEvents", () => {
  it("keeps this type's events that start in the window, by start", () => {
    const selected = selectSeasonEvents(
      fires,
      [
        event("Fira de Nadal", "2026-12-13"),
        event("Mercat de Nadal", "2026-11-28", "vic"),
        // Starts before the window, though it runs into it.
        event("Fira de Nadal", "2026-10-30", "olot", "2026-12-24"),
        event("Fira de Nadal", "2027-01-11", "reus"),
        event("Concert de Nadal", "2026-12-20"),
      ],
      2026,
    );
    expect(selected.map(({ act }) => act.citySlug)).toEqual([
      "vic",
      "cardedeu",
    ]);
  });

  it("drops repeats in one town but keeps the same title in two towns", () => {
    const a = event("Fira de Nadal", "2026-12-13", "altafulla");
    const selected = selectSeasonEvents(
      fires,
      [
        a,
        a,
        event("Fira de Nadal", "2026-12-13", "altafulla", "2026-12-14"),
        event("Fira de Nadal", "2026-12-13", "cervello"),
        event("Fira de Nadal", "2026-12-14", "altafulla"),
      ],
      2026,
    );
    expect(
      selected.map(({ act }) => `${act.citySlug} ${act.startDate}`),
    ).toEqual([
      "altafulla 2026-12-13",
      "cervello 2026-12-13",
      "altafulla 2026-12-14",
    ]);
  });
});

const item = (town: string, startDate: string): FestivityListItem => ({
  id: `${town}-${startDate}`,
  slug: `${town}-${startDate}`,
  title: "Fira de Nadal",
  startDate,
  startTime: null,
  endDate: startDate,
  endTime: null,
  location: "",
  citySlug: town,
  cityName: town,
  regionSlug: null,
  regionName: null,
});

describe("buildFestivityPageData", () => {
  const towns = ["a", "b", "c", "d", "e"];

  it("splits this season into upcoming and past, and lists last season's towns with no date yet", () => {
    const data = buildFestivityPageData({
      slug: "fires-de-nadal",
      seasonYear: 2026,
      today: "2026-12-10",
      seasons: {
        current: [
          event("Fira de Nadal", "2026-11-28", "a"),
          event("Fira de Nadal", "2026-12-08", "b", "2026-12-10"),
          event("Fira de Nadal", "2026-12-20", "c"),
        ],
        previous: [
          item("d", "2025-12-14"),
          item("a", "2025-11-29"),
          item("e", "2025-12-06"),
        ],
        complete: true,
      },
    });
    expect(data.upcoming.map((e) => e.city?.slug)).toEqual(["b", "c"]);
    expect(data.past.map((e) => e.citySlug)).toEqual(["a"]);
    expect(data.pending.map((e) => e.citySlug)).toEqual(["e", "d"]);
    expect(data.towns).toBe(3);
    expect(data.year).toBe(2026);
    // 3 towns now, 3 last season: not enough.
    expect(data.indexable).toBe(false);
  });

  it("is indexable from last season's towns before this season's are out", () => {
    const data = buildFestivityPageData({
      slug: "cavalcades-de-reis",
      seasonYear: 2026,
      today: "2026-11-08",
      seasons: {
        current: [],
        previous: towns.map((t) => item(t, "2026-01-05")),
        complete: true,
      },
    });
    expect(data.year).toBe(2027);
    expect(data.upcoming).toEqual([]);
    expect(data.pending).toHaveLength(5);
    expect(data.indexable).toBe(true);
    expect(indexableFestivityPaths([data, null])).toEqual([
      "/cavalcades-de-reis",
    ]);
  });

  it("is not indexable from capped results or a backend failure", () => {
    const seasons = {
      current: [],
      previous: towns.map((t) => item(t, "2025-12-13")),
      complete: false,
    };
    const capped = buildFestivityPageData({
      slug: "fires-de-nadal",
      seasonYear: 2026,
      today: "2026-11-08",
      seasons,
    });
    expect(capped.indexable).toBe(false);
    const failed = buildFestivityPageData({
      slug: "fires-de-nadal",
      seasonYear: 2026,
      today: "2026-11-08",
      seasons: null,
    });
    expect(failed).toMatchObject({ available: false, indexable: false });
  });
});

describe("fetchAllEventPagesExternal", () => {
  const summary = (id: number, startDate: string) => ({
    id: `e${id}`,
    hash: `h${id}`,
    slug: `e${id}`,
    title: "Fira de Nadal",
    isPromoted: false,
    url: "https://example.com",
    description: "",
    imageUrl: "",
    startDate,
    startTime: null,
    endDate: startDate,
    endTime: null,
    location: "Cardedeu",
    visits: 0,
    origin: "MANUAL",
    categories: [],
  });
  // 6 events a day for 30 days: 180, over three pages of 50.
  const days = Array.from(
    { length: 30 },
    (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`,
  );
  const dataset = days.flatMap((day, d) =>
    Array.from({ length: 6 }, (_, i) => summary(d * 6 + i, day)),
  );
  // Like the backend with from/to (Esdeveniments/esdeveniments-backend#63):
  // every response comes back in a new random order.
  const shuffledBackend = (events: ReturnType<typeof summary>[]) =>
    vi.mocked(fetchWithHmac).mockImplementation(async (url) => {
      const q = new URL(String(url)).searchParams;
      const [from, to] = [q.get("from"), q.get("to")];
      const page = Number(q.get("page"));
      const size = Number(q.get("size"));
      const rows = events
        .filter((e) => !from || !to || (e.startDate >= from && e.startDate <= to))
        .map((e) => ({ e, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map(({ e }) => e);
      return Response.json({
        content: rows.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElements: rows.length,
        totalPages: Math.ceil(rows.length / size),
        last: (page + 1) * size >= rows.length,
      });
    });

  beforeEach(() => {
    vi.mocked(fetchWithHmac).mockReset();
  });

  it("gets every event of a date range despite the random order", async () => {
    shuffledBackend(dataset);
    const result = await fetchAllEventPagesExternal(
      { term: "fira", from: "2026-12-01", to: "2026-12-30" },
      { maxRequests: 30 },
    );
    expect(result.complete).toBe(true);
    expect(result.events).toHaveLength(180);
    expect(new Set(result.events.map((e) => e.id)).size).toBe(180);
    expect(vi.mocked(fetchWithHmac).mock.calls[0][1]).toMatchObject({
      skipConnection: true,
    });
  });

  it("makes one request when the range fits in a page", async () => {
    shuffledBackend(dataset);
    const result = await fetchAllEventPagesExternal(
      { term: "fira", from: "2026-12-01", to: "2026-12-05" },
      { maxRequests: 30 },
    );
    expect(result).toMatchObject({ complete: true });
    expect(result.events).toHaveLength(30);
    expect(fetchWithHmac).toHaveBeenCalledTimes(1);
  });

  it("pages a single day that overflows and says when events are missing", async () => {
    const busyDay = Array.from({ length: 120 }, (_, i) =>
      summary(i, "2026-12-08"),
    );
    shuffledBackend(busyDay);
    const result = await fetchAllEventPagesExternal(
      { term: "fira", from: "2026-12-08", to: "2026-12-08" },
      { maxRequests: 30 },
    );
    expect(fetchWithHmac).toHaveBeenCalledTimes(3);
    expect(result.complete).toBe(result.events.length === 120);
  });

  it("stops at the request cap and says the result is incomplete", async () => {
    shuffledBackend(dataset);
    const result = await fetchAllEventPagesExternal(
      { term: "fira", from: "2026-12-01", to: "2026-12-30" },
      { maxRequests: 2 },
    );
    expect(result.complete).toBe(false);
    expect(fetchWithHmac).toHaveBeenCalledTimes(2);
  });

  it("throws on a failed request instead of returning a partial list", async () => {
    shuffledBackend(dataset);
    const backend = vi.mocked(fetchWithHmac).getMockImplementation()!;
    vi.mocked(fetchWithHmac).mockImplementation(async (url, init) =>
      new URL(String(url)).searchParams.get("from") === "2026-12-01" &&
      new URL(String(url)).searchParams.get("to") !== "2026-12-30"
        ? new Response("", { status: 503 })
        : backend(url, init),
    );
    await expect(
      fetchAllEventPagesExternal(
        { term: "fira", from: "2026-12-01", to: "2026-12-30" },
        { maxRequests: 30 },
      ),
    ).rejects.toThrow("HTTP 503");
  });
});
