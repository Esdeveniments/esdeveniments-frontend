import { describe, expect, it } from "vitest";
import type {
  FestaMajorPlaceInfo,
  FestaMajorPlacedAct,
  FestaMajorPlaceYears,
} from "types/festa-major";
import { buildFestaMajorPageData } from "@utils/festa-major-hub";
import {
  indexableHubPaths,
  listRegions,
  summarizeTowns,
  upcomingTowns,
} from "@utils/festa-major-calendar";
import { festaMajorHubPathsFor } from "@utils/festa-major-paths";

let nextId = 0;
const act = (
  title: string,
  startDate: string,
  town = "malgrat-de-mar",
  region = "maresme",
): FestaMajorPlacedAct => ({
  id: String(++nextId),
  slug: `act-${nextId}`,
  title,
  startDate,
  startTime: null,
  endDate: startDate,
  endTime: null,
  location: "",
  citySlug: town,
  cityName: town,
  regionSlug: region,
  regionName: region,
});

/** `count` acts of one festa, a day apart from `start` (YYYY-MM-DD, days 10+). */
const acts = (
  title: string,
  start: string,
  count: number,
  town?: string,
  region?: string,
): FestaMajorPlacedAct[] =>
  Array.from({ length: count }, (_, i) =>
    act(
      `${title} ${i}`,
      `${start.slice(0, 8)}${String(Number(start.slice(8)) + i).padStart(2, "0")}`,
      town,
      region,
    ),
  );

const town: FestaMajorPlaceInfo = {
  slug: "malgrat-de-mar",
  label: "Malgrat de Mar",
  type: "town",
  regionSlug: "maresme",
  regionLabel: "Maresme",
};
const region: FestaMajorPlaceInfo = {
  slug: "maresme",
  label: "Maresme",
  type: "region",
  regionSlug: null,
  regionLabel: null,
};

const page = (
  place: FestaMajorPlaceInfo,
  years: FestaMajorPlaceYears | null,
  festaKey?: string,
) =>
  buildFestaMajorPageData({
    place,
    years,
    festaKey,
    currentYear: 2026,
    today: "2026-07-20",
  });

const years = (
  current: FestaMajorPlacedAct[],
  previous: FestaMajorPlacedAct[] = [],
): FestaMajorPlaceYears => ({ year: 2026, current, previous, complete: true });

// Sant Roc in August (6 acts) and Sant Nicolau in December (2 acts).
const twoFestes = () =>
  years([
    ...acts("Festa Major de Sant Roc: concert", "2026-08-10", 6),
    ...acts("Festa Major de Sant Nicolau: ball", "2026-12-10", 2),
  ]);

describe("buildFestaMajorPageData", () => {
  it("keeps default robots and shows nothing when the backend failed", () => {
    const data = page(town, null);
    expect(data).toMatchObject({
      available: false,
      indexable: false,
      town: null,
    });
  });

  it("indexes a town hub with enough acts this year", () => {
    const data = page(
      town,
      years(acts("Festa Major: correfoc", "2026-08-10", 5)),
    );
    expect(data.indexable).toBe(true);
    expect(data.town).toMatchObject({ year: 2026, isCurrentYear: true });
    expect(data.canonicalPath).toBe("/festa-major/malgrat-de-mar");
  });

  it("shows a hub cut short by the request cap, but noindexes it", () => {
    const data = page(town, {
      ...years(acts("Festa Major: correfoc", "2026-08-10", 5)),
      complete: false,
    });
    expect(data).toMatchObject({ available: true, indexable: false });
    expect(data.town?.acts).toHaveLength(5);
  });

  it("noindexes a thin town hub, and one with no acts at all", () => {
    expect(
      page(town, years(acts("Festa Major: ball", "2026-08-10", 4))).indexable,
    ).toBe(false);
    const empty = page(town, years([]));
    expect(empty).toMatchObject({ available: true, indexable: false });
    expect(empty.town?.acts).toEqual([]);
  });

  it("shows last year's programme until this year's is out, listing what is announced", () => {
    const data = page(
      town,
      years(
        acts("Festa Major: pregó", "2026-08-10", 2),
        acts("Festa Major: concert", "2025-08-10", 8),
      ),
    );
    expect(data.town).toMatchObject({ year: 2025, isCurrentYear: false });
    expect(data.town?.acts).toHaveLength(8);
    expect(data.town?.announced).toHaveLength(2);
    expect(data.indexable).toBe(true);
  });

  it("lists a town's festes and gives a page only to named ones with enough acts", () => {
    const data = page(town, twoFestes());
    expect(data.festes.map((f) => [f.key, f.hasPage])).toEqual([
      ["sant-roc", true],
      ["sant-nicolau", false],
    ]);
  });

  it("indexes a festa page with its own acts only", () => {
    const data = page(town, twoFestes(), "sant-roc");
    expect(data).toMatchObject({
      indexable: true,
      festaKey: "sant-roc",
      festaLabel: "Festa Major de Sant Roc",
      canonicalPath: "/festa-major/malgrat-de-mar/sant-roc",
    });
    expect(data.festa?.acts).toHaveLength(6);
  });

  it("renders a small festa but noindexes it", () => {
    const data = page(town, twoFestes(), "sant-nicolau");
    expect(data.festa?.acts).toHaveLength(2);
    expect(data.indexable).toBe(false);
  });

  it("noindexes an unknown festa, and a town's only festa (the hub has it)", () => {
    expect(page(town, twoFestes(), "sant-joan")).toMatchObject({
      festa: null,
      indexable: false,
    });
    const single = page(
      town,
      years(acts("Festa Major de Sant Roc: concert", "2026-08-10", 6)),
      "sant-roc",
    );
    expect(single.festes).toHaveLength(1);
    expect(single.festa?.acts).toHaveLength(6);
    expect(single.indexable).toBe(false);
  });

  it("gives no page to a festa with every act of the hub (the other is last year's)", () => {
    const data = page(
      town,
      years(acts("Festa Major de Sant Roc: concert", "2026-08-10", 6), [
        ...acts("Festa Major de Sant Nicolau: ball", "2025-12-10", 5),
      ]),
    );
    expect(data.festes.map((f) => [f.key, f.hasPage])).toEqual([
      ["sant-roc", false],
      ["sant-nicolau", true],
    ]);
  });

  it("indexes a region hub with two towns of five or more acts", () => {
    const one = acts("Festa Major: concert", "2026-08-10", 5, "calella");
    const two = acts("Festa Major: ball", "2026-07-10", 5, "pineda-de-mar");
    const thin = acts("Festa Major: ball", "2026-07-10", 2, "tordera");
    expect(page(region, years([...one, ...thin])).indexable).toBe(false);
    const data = page(region, years([...one, ...two, ...thin]));
    expect(data.indexable).toBe(true);
    expect(data.region?.towns.map((t) => t.slug)).toEqual([
      "pineda-de-mar",
      "tordera",
      "calella",
    ]);
  });

  it("noindexes a festa segment under a region", () => {
    const data = page(
      region,
      years(acts("Festa Major: ball", "2026-07-10", 9)),
      "x",
    );
    expect(data).toMatchObject({
      region: null,
      indexable: false,
      festaKey: "x",
    });
  });
});

describe("calendar helpers", () => {
  const calendar = summarizeTowns(
    [
      ...acts(
        "Festa Major de Sant Roc: concert",
        "2026-08-10",
        6,
        "malgrat-de-mar",
      ),
      ...acts(
        "Festa Major de Sant Nicolau: ball",
        "2026-12-10",
        5,
        "malgrat-de-mar",
      ),
      ...acts("Festa Major: ball", "2026-07-25", 5, "calella"),
      ...acts("Festa Major: ball", "2026-07-18", 3, "tordera"),
      ...acts("Festa Major: ball", "2026-07-21", 7, "girona", "girones"),
    ],
    acts("Festa Major: ball", "2025-07-22", 9, "blanes", "selva"),
    2026,
    true,
  );

  it("lists festes on now or in the next days by date, skipping last-year guesses", () => {
    const upcoming = upcomingTowns(calendar, "2026-07-20", 14);
    expect(upcoming.map((t) => [t.slug, t.main.start])).toEqual([
      ["tordera", "2026-07-18"],
      ["girona", "2026-07-21"],
      ["calella", "2026-07-25"],
    ]);
    expect(
      upcomingTowns(calendar, "2026-12-12", 14).map((t) => t.main.key),
    ).toEqual(["sant-nicolau"]);
  });

  it("links only regions with two indexable towns", () => {
    expect(listRegions(calendar)).toEqual([
      { slug: "maresme", name: "maresme", towns: 2 },
    ]);
  });

  it("puts indexable regions, towns and festa pages in the sitemap", () => {
    expect(indexableHubPaths(calendar).sort()).toEqual(
      [
        "/festa-major/maresme",
        "/festa-major/malgrat-de-mar",
        "/festa-major/calella",
        "/festa-major/girona",
        "/festa-major/blanes",
        "/festa-major/malgrat-de-mar/sant-roc",
        "/festa-major/malgrat-de-mar/sant-nicolau",
      ].sort(),
    );
  });
});

describe("festaMajorHubPathsFor", () => {
  it("returns each festa major act's town hub once, skipping the rest", () => {
    expect(
      festaMajorHubPathsFor([
        { title: "Festa Major: correfoc", city: { slug: "gracia" } },
        { title: "Festa Major de Gràcia: cercavila", city: { slug: "gracia" } },
        { title: "Concert de jazz", city: { slug: "sants" } },
        { title: "Festa Major: havaneres", city: null },
        { title: null, city: { slug: "sants" } },
        null,
      ]),
    ).toEqual(["/festa-major/gracia"]);
  });
});
