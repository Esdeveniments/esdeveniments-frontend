import type { EventSummaryResponseDTO } from "types/api/event";
import type { FestaMajorHubEvent } from "types/festa-major";
import type {
  FestivityListItem,
  FestivityPageData,
  FestivitySeasons,
  FestivitySlug,
  FestivityType,
} from "types/festivity";
import type { SeoLinkItem } from "types/props";
import { FESTIVITY_TYPES } from "@config/festivities";
import { FESTIVITY_MIN_INDEXABLE_TOWNS } from "./constants";
import { addDaysYmd } from "./date-helpers";
import { compareActs } from "./festa-major";
import { toPlacedAct } from "./festa-major-hub";
import { festaMajorHubPathsFor } from "./festa-major-paths";
import { normalizeForSearch } from "./string-helpers";
import { stripHtmlTags } from "./sanitize";

export const festivityPath = (slug: FestivitySlug): `/${FestivitySlug}` =>
  `/${slug}`;

export const getFestivityType = (slug: FestivitySlug): FestivityType =>
  FESTIVITY_TYPES.find((type) => type.slug === slug) ?? FESTIVITY_TYPES[0];

/**
 * The season a Madrid YYYY-MM-DD date belongs to: the running one until its
 * last day (7 January 2027 is Nadal 2026), then the next one.
 */
export function seasonYearOf(type: FestivityType, date: string): number {
  const year = Number(date.slice(0, 4));
  if (date <= type.window(year - 1).to) return year - 1;
  return date <= type.window(year).to ? year : year + 1;
}

/**
 * Whether site links to a type's page show on a Madrid YYYY-MM-DD date: from
 * `leadDays` before its season starts to the season's last day.
 */
export function isInFestivitySeason(type: FestivityType, date: string): boolean {
  const { from, to } = type.window(seasonYearOf(type, date));
  return date >= addDaysYmd(from, -type.leadDays) && date <= to;
}

/** The festivity types whose site links show on a Madrid YYYY-MM-DD date. */
export const inSeasonFestivities = (date: string): FestivityType[] =>
  FESTIVITY_TYPES.filter((type) => isInFestivitySeason(type, date));

/** Links to festivity pages, e.g. the in-season ones. */
export const seasonalFestivityLinks = (
  types: readonly FestivityType[],
  name: (type: FestivityType) => string,
): SeoLinkItem[] =>
  types.map((type) => ({ href: festivityPath(type.slug), label: name(type) }));

export function matchesFestivity(type: FestivityType, title: string): boolean {
  const normalized = normalizeForSearch(stripHtmlTags(title));
  return type.include.test(normalized) && !type.exclude?.test(normalized);
}

/** Every collection an event's title belongs to (a title can match two). */
export const festivitiesForTitle = (title: string): FestivityType[] =>
  FESTIVITY_TYPES.filter((type) => matchesFestivity(type, title));

/** Collection pages a changed event appears on (for IndexNow). */
export function festivityPathsFor(
  events: readonly ({ title?: string | null } | null | undefined)[],
): string[] {
  const paths = events.flatMap((event) =>
    event?.title
      ? festivitiesForTitle(event.title).map((type) => festivityPath(type.slug))
      : [],
  );
  return [...new Set(paths)];
}

/** Every hub a changed event is on (its festa major, the Nadal pages), for IndexNow. */
export const hubPathsFor = (
  events: readonly (FestaMajorHubEvent | null | undefined)[],
): string[] => [...festaMajorHubPathsFor(events), ...festivityPathsFor(events)];

/**
 * A season's events of one type, by start. The backend matches any event that
 * overlaps the window and any title with a term; keep those that start in it
 * and really are this type. Repeats go: same id, or the same title on the same
 * day in the same town (scraped twice). Two towns can share a title and day.
 */
export function selectSeasonEvents(
  type: FestivityType,
  events: readonly EventSummaryResponseDTO[],
  seasonYear: number,
): { event: EventSummaryResponseDTO; act: FestivityListItem }[] {
  const { from, to } = type.window(seasonYear);
  const seen = new Set<string>();
  const selected: { event: EventSummaryResponseDTO; act: FestivityListItem }[] =
    [];
  for (const event of events) {
    const act = toPlacedAct(event);
    if (!act || act.startDate < from || act.startDate > to) continue;
    if (!matchesFestivity(type, act.title)) continue;
    const keys = [
      `id:${act.id}`,
      `${act.citySlug}|${normalizeForSearch(act.title)}|${act.startDate}`,
    ];
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    selected.push({ event, act });
  }
  return selected.sort((a, b) => compareActs(a.act, b.act));
}

/**
 * What /<festivity> shows: this season's events still to come (as cards),
 * the ones already over, and last season's towns with no date yet. `seasons`
 * null means the backend failed. Indexable with events in enough towns this
 * season or last. The reader keeps capped reads: the Reis fill 5 January past
 * one page, and esdeveniments-backend#63 keeps that day from paging complete.
 */
export function buildFestivityPageData({
  slug,
  seasons,
  seasonYear,
  today,
}: {
  slug: FestivitySlug;
  seasons: FestivitySeasons | null;
  seasonYear: number;
  today: string;
}): FestivityPageData {
  const base: FestivityPageData = {
    slug,
    seasonYear,
    year: seasonYear + getFestivityType(slug).yearOffset,
    today,
    available: seasons !== null,
    upcoming: [],
    past: [],
    pending: [],
    towns: 0,
    indexable: false,
  };
  if (!seasons) return base;

  const current = seasons.current.flatMap((event) => {
    const act = toPlacedAct(event);
    return act ? [{ event, act }] : [];
  });
  const currentTowns = new Set(current.map(({ act }) => act.citySlug));
  const previousTowns = new Set(seasons.previous.map((act) => act.citySlug));
  return {
    ...base,
    upcoming: current
      .filter(({ act }) => act.endDate >= today)
      .map(({ event }) => event),
    past: current
      .filter(({ act }) => act.endDate < today)
      .map(({ act }) => act),
    pending: seasons.previous
      .filter((act) => !currentTowns.has(act.citySlug))
      .sort(compareActs),
    towns: currentTowns.size,
    indexable:
      Math.max(currentTowns.size, previousTowns.size) >=
      FESTIVITY_MIN_INDEXABLE_TOWNS,
  };
}

/** Indexable collection paths, for the sitemap. */
export const indexableFestivityPaths = (
  pages: readonly (FestivityPageData | null)[],
): string[] =>
  pages.flatMap((page) => (page?.indexable ? [festivityPath(page.slug)] : []));
