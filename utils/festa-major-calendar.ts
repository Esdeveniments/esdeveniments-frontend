import type {
  FestaMajorCalendar,
  FestaMajorPlacedAct,
  FestaMajorRegionLink,
  FestaMajorTownSummary,
} from "types/festa-major";
import { FESTA_MAJOR_MIN_INDEXABLE_ACTS } from "./constants";
import { addDaysYmd } from "./date-helpers";
import {
  dedupeActs,
  groupEditions,
  mainEdition,
  pickYear,
  startingIn,
  summarizeEdition,
} from "./festa-major";
import { festaMajorPath } from "./festa-major-paths";

/** Acts per town, deduped per town: two towns can share an act title and day. */
const byTown = (
  acts: FestaMajorPlacedAct[],
): Map<string, FestaMajorPlacedAct[]> => {
  const towns = new Map<string, FestaMajorPlacedAct[]>();
  for (const act of acts) {
    towns.set(act.citySlug, [...(towns.get(act.citySlug) ?? []), act]);
  }
  for (const [slug, townActs] of towns) towns.set(slug, dedupeActs(townActs));
  return towns;
};

/** Every town with festa major acts this year (or last year), by its main festa's date. */
export function summarizeTowns(
  currentActs: FestaMajorPlacedAct[],
  previousActs: FestaMajorPlacedAct[],
  currentYear: number,
): FestaMajorCalendar {
  const current = byTown(startingIn(currentActs, currentYear));
  const previous = byTown(startingIn(previousActs, currentYear - 1));
  const towns: FestaMajorTownSummary[] = [];
  for (const slug of new Set([...current.keys(), ...previous.keys()])) {
    const thisYear = current.get(slug) ?? [];
    const lastYear = previous.get(slug) ?? [];
    const choice = pickYear(currentYear, thisYear.length, lastYear.length);
    const acts = choice.isCurrentYear ? thisYear : lastYear;
    const [{ cityName, regionSlug, regionName }] = acts;
    const editions = groupEditions(acts, cityName).map(summarizeEdition);
    const main = mainEdition(editions);
    if (!main) continue;
    towns.push({
      ...choice,
      slug,
      name: cityName,
      regionSlug,
      regionName,
      count: acts.length,
      main,
      editions,
    });
  }
  towns.sort(
    (a, b) =>
      a.main.start.slice(5).localeCompare(b.main.start.slice(5)) ||
      a.name.localeCompare(b.name, "ca"),
  );
  return { currentYear, towns };
}

const isIndexableTown = (town: FestaMajorTownSummary): boolean =>
  town.count >= FESTA_MAJOR_MIN_INDEXABLE_ACTS;

/** Towns with enough acts to stand alone; a region hub needs two of them. */
export const countIndexableTowns = (calendar: FestaMajorCalendar): number =>
  calendar.towns.filter(isIndexableTown).length;

export const MIN_INDEXABLE_REGION_TOWNS = 2;

/** Regions whose hub is indexable, by name. */
export function listRegions(
  calendar: FestaMajorCalendar,
): FestaMajorRegionLink[] {
  const regions = new Map<string, FestaMajorRegionLink>();
  for (const town of calendar.towns.filter(isIndexableTown)) {
    if (!town.regionSlug || !town.regionName) continue;
    const region = regions.get(town.regionSlug) ?? {
      slug: town.regionSlug,
      name: town.regionName,
      towns: 0,
    };
    regions.set(town.regionSlug, { ...region, towns: region.towns + 1 });
  }
  return [...regions.values()]
    .filter((region) => region.towns >= MIN_INDEXABLE_REGION_TOWNS)
    .sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

/**
 * Towns with a festa on now or starting within `days`, by start date. Each
 * shows that festa (not its main one). Last-year-only towns are left out:
 * their dates are a guess.
 */
export function upcomingTowns(
  calendar: FestaMajorCalendar,
  today: string,
  days: number,
): FestaMajorTownSummary[] {
  const until = addDaysYmd(today, days);
  return calendar.towns
    .filter((town) => town.isCurrentYear)
    .flatMap((town) => {
      const edition = town.editions.find(
        (e) => e.end >= today && e.start <= until,
      );
      return edition ? [{ ...town, main: edition }] : [];
    })
    .sort(
      (a, b) =>
        a.main.start.localeCompare(b.main.start) ||
        a.name.localeCompare(b.name, "ca"),
    );
}

/**
 * Indexable hub paths for the sitemap: towns, regions and named festes with
 * their own page (from the calendar's year per town).
 */
export function indexableHubPaths(calendar: FestaMajorCalendar): string[] {
  const towns = calendar.towns.filter(isIndexableTown);
  const festes = towns.flatMap((town) => {
    const counts = new Map<string, number>();
    for (const e of town.editions) {
      counts.set(e.key, (counts.get(e.key) ?? 0) + e.count);
    }
    if (counts.size < 2) return [];
    return [...counts]
      .filter(([key, count]) => key && count >= FESTA_MAJOR_MIN_INDEXABLE_ACTS)
      .map(([key]) => festaMajorPath(town.slug, key));
  });
  return [
    ...listRegions(calendar).map((region) => festaMajorPath(region.slug)),
    ...towns.map((town) => festaMajorPath(town.slug)),
    ...festes,
  ];
}
