import type { EventSummaryResponseDTO } from "types/api/event";
import type {
  FestaMajorAct,
  FestaMajorEdition,
  FestaMajorFestaLink,
  FestaMajorPageData,
  FestaMajorPlaceInfo,
  FestaMajorPlaceYears,
  FestaMajorPlacedAct,
  FestaMajorTownData,
} from "types/festa-major";
import { FESTA_MAJOR_MIN_INDEXABLE_ACTS } from "./constants";
import {
  compareActs,
  dedupeActs,
  groupEditions,
  pickYear,
  startingIn,
  summarizeEdition,
  toFestaMajorAct,
} from "./festa-major";
import {
  countIndexableTowns,
  MIN_INDEXABLE_REGION_TOWNS,
  summarizeTowns,
} from "./festa-major-calendar";
import { festaMajorPath } from "./festa-major-paths";

/** A lean act plus its town, or null for events without a town or date. */
export function toPlacedAct(
  event: EventSummaryResponseDTO,
): FestaMajorPlacedAct | null {
  const act = toFestaMajorAct(event);
  if (!act || !event.city?.slug || !event.city.name) return null;
  return {
    ...act,
    citySlug: event.city.slug,
    cityName: event.city.name,
    regionSlug: event.region?.slug ?? null,
    regionName: event.region?.name ?? null,
  };
}

const leanAct = ({
  id,
  slug,
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  location,
  imageUrl,
}: FestaMajorAct): FestaMajorAct => ({
  id,
  slug,
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  location,
  ...(imageUrl ? { imageUrl } : {}),
});

const yearEditions = (
  acts: FestaMajorAct[],
  year: number,
  townLabel: string,
): FestaMajorEdition[] =>
  groupEditions(dedupeActs(startingIn(acts, year)).map(leanAct), townLabel);

/**
 * One town's hub, or one of its festes when `key` is given: this year's acts,
 * or last year's until this year's programme is out.
 */
export function buildTownData(
  currentActs: FestaMajorAct[],
  previousActs: FestaMajorAct[],
  currentYear: number,
  townLabel: string,
  key?: string,
): FestaMajorTownData {
  const select = (acts: FestaMajorAct[], year: number) =>
    yearEditions(acts, year, townLabel).filter(
      (edition) => key === undefined || edition.key === key,
    );
  const current = select(currentActs, currentYear);
  const previous = select(previousActs, currentYear - 1);
  const count = (editions: FestaMajorEdition[]) =>
    editions.reduce((sum, edition) => sum + edition.acts.length, 0);
  const choice = pickYear(currentYear, count(current), count(previous));
  const editions = choice.isCurrentYear ? current : previous;
  return {
    ...choice,
    acts: editions.flatMap((edition) => edition.acts).sort(compareActs),
    editions,
    previousEditions: choice.isCurrentYear
      ? previous.map(summarizeEdition)
      : [],
    announced: choice.isCurrentYear
      ? []
      : current.flatMap((edition) => edition.acts).sort(compareActs),
  };
}

const monthDay = (date: string): string => date.slice(5);

/**
 * A town's festes (this or last year each), listed on its hub when there are
 * two or more. `townYear` is the year the hub's programme shows.
 */
export function listFestes(
  years: FestaMajorPlaceYears,
  townLabel: string,
  townYear: number,
): FestaMajorFestaLink[] {
  const keys = new Set(
    [
      ...yearEditions(years.current, years.year, townLabel),
      ...yearEditions(years.previous, years.year - 1, townLabel),
    ].map((edition) => edition.key),
  );
  const festes: FestaMajorFestaLink[] = [];
  for (const key of keys) {
    const data = buildTownData(
      years.current,
      years.previous,
      years.year,
      townLabel,
      key,
    );
    const first = data.editions[0];
    const last = data.editions[data.editions.length - 1];
    if (!first || !last) continue;
    festes.push({
      key,
      label: first.label,
      start: first.start,
      end: last.end,
      count: data.acts.length,
      year: data.year,
      inProgramme: data.year === townYear,
      firstActSlug: data.acts[0].slug,
    });
  }
  return festes.sort(
    (a, b) =>
      monthDay(a.start).localeCompare(monthDay(b.start)) ||
      a.key.localeCompare(b.key),
  );
}

/**
 * What /festa-major/<place> shows. `years` null means the backend failed: the
 * page says so and keeps default robots, so a blip doesn't noindex a good hub.
 */
export function buildFestaMajorPageData({
  place,
  years,
  currentYear,
  today,
}: {
  place: FestaMajorPlaceInfo;
  years: FestaMajorPlaceYears | null;
  currentYear: number;
  today: string;
}): FestaMajorPageData {
  const base: FestaMajorPageData = {
    place,
    currentYear,
    today,
    town: null,
    festes: [],
    region: null,
    available: years !== null,
    indexable: false,
    canonicalPath: festaMajorPath(place.slug),
  };
  if (!years) return base;

  if (place.type === "region") {
    const region = summarizeTowns(
      years.current,
      years.previous,
      years.year,
      years.complete,
    );
    return {
      ...base,
      region,
      indexable:
        years.complete &&
        countIndexableTowns(region) >= MIN_INDEXABLE_REGION_TOWNS,
    };
  }

  const town = buildTownData(
    years.current,
    years.previous,
    years.year,
    place.label,
  );
  return {
    ...base,
    town,
    festes: listFestes(years, place.label, town.year),
    indexable:
      years.complete && town.acts.length >= FESTA_MAJOR_MIN_INDEXABLE_ACTS,
  };
}
