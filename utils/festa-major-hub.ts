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
 * A town's festes (this or last year each). Only a town with two or more
 * festes lists them and gives the named ones with enough acts a page.
 */
export function listFestes(
  years: FestaMajorPlaceYears,
  townLabel: string,
): FestaMajorFestaLink[] {
  const keys = new Set(
    [
      ...yearEditions(years.current, years.year, townLabel),
      ...yearEditions(years.previous, years.year - 1, townLabel),
    ].map((edition) => edition.key),
  );
  // A festa with every act of the town hub would duplicate it.
  const townActs = buildTownData(
    years.current,
    years.previous,
    years.year,
    townLabel,
  ).acts.length;
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
      hasPage:
        keys.size >= 2 &&
        key !== "" &&
        data.acts.length >= FESTA_MAJOR_MIN_INDEXABLE_ACTS &&
        data.acts.length < townActs,
    });
  }
  return festes.sort(
    (a, b) =>
      monthDay(a.start).localeCompare(monthDay(b.start)) ||
      a.key.localeCompare(b.key),
  );
}

/**
 * What /festa-major/<place>[/<festa>] shows. `years` null means the backend
 * failed: the page says so and keeps default robots, so a blip doesn't
 * noindex a good hub.
 */
export function buildFestaMajorPageData({
  place,
  years,
  festaKey,
  currentYear,
  today,
}: {
  place: FestaMajorPlaceInfo;
  years: FestaMajorPlaceYears | null;
  festaKey?: string;
  currentYear: number;
  today: string;
}): FestaMajorPageData {
  const base: FestaMajorPageData = {
    place,
    currentYear,
    today,
    town: null,
    festaKey: festaKey ?? null,
    festa: null,
    festaLabel: null,
    festes: [],
    region: null,
    available: years !== null,
    indexable: false,
    canonicalPath: festaMajorPath(place.slug, festaKey),
  };
  if (!years) return base;

  if (place.type === "region") {
    if (festaKey !== undefined) return base;
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

  const festes = listFestes(years, place.label);
  if (festaKey === undefined) {
    const town = buildTownData(
      years.current,
      years.previous,
      years.year,
      place.label,
    );
    return {
      ...base,
      town,
      festes,
      indexable:
        years.complete && town.acts.length >= FESTA_MAJOR_MIN_INDEXABLE_ACTS,
    };
  }

  const link = festes.find((festa) => festa.key === festaKey && festa.key);
  if (!link) return { ...base, festes };
  return {
    ...base,
    festes,
    festa: buildTownData(
      years.current,
      years.previous,
      years.year,
      place.label,
      festaKey,
    ),
    festaLabel: link.label,
    indexable: years.complete && link.hasPage,
  };
}
