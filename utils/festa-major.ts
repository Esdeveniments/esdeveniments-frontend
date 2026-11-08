import type { EventSummaryResponseDTO } from "types/api/event";
import type {
  FestaMajorAct,
  FestaMajorEdition,
  FestaMajorEditionSummary,
  FestaMajorName,
  FestaMajorYearChoice,
} from "types/festa-major";
import { FESTA_MAJOR_MIN_INDEXABLE_ACTS, MS_PER_DAY } from "./constants";
import { consolidateKeys, extractFestaName } from "./festa-major-name";
import { dropPlaceParts, normalizeForSearch } from "./string-helpers";
import { stripHtmlTags } from "./sanitize";

/** Acts more than this many days after the previous one start a new festa. */
const CLUSTER_GAP_DAYS = 14;
/**
 * Unnamed acts longer than this from the first one start a new festa: in a city
 * with festes all year ("Concert de Festa Major" every other week) they would
 * otherwise chain into one festa running for months.
 */
const MAX_UNNAMED_SPAN_DAYS = 28;
/** Longer acts (exhibitions) count only by their start day for a festa's dates. */
const MAX_COUNTED_SPAN_DAYS = 3;

const ymd = (value: string | null | undefined): string =>
  /^\d{4}-\d{2}-\d{2}/.test(value ?? "") ? (value as string).slice(0, 10) : "";

export const dayNumber = (date: string): number =>
  Math.round(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);

const sortKey = (act: FestaMajorAct): string =>
  `${act.startDate}T${act.startTime ?? "99:99"}`;

export const compareActs = (a: FestaMajorAct, b: FestaMajorAct): number =>
  sortKey(a).localeCompare(sortKey(b)) || a.title.localeCompare(b.title);

/** The lean act the hubs cache, or null when the event has no usable start date. */
export function toFestaMajorAct(
  event: EventSummaryResponseDTO,
): FestaMajorAct | null {
  const startDate = ymd(event.startDate);
  const title = stripHtmlTags(event.title ?? "");
  if (!startDate || !event.slug || !title) return null;
  const endDate = ymd(event.endDate);
  return {
    id: String(event.id),
    slug: event.slug,
    title,
    startDate,
    startTime: event.startTime || null,
    endDate: endDate && endDate >= startDate ? endDate : startDate,
    endTime: event.endTime || null,
    // The hub already names the town: "Plaça de la Creu, Cardedeu, Vallès Oriental" → "Plaça de la Creu".
    location: dropPlaceParts(
      stripHtmlTags(event.location ?? ""),
      event.city?.name,
      event.region?.name,
    ),
    ...(event.imageUrl?.trim() ? { imageUrl: event.imageUrl } : {}),
  };
}

/** Drops repeats: same id, or the same title at the same start (scraped twice). */
export function dedupeActs<T extends FestaMajorAct>(acts: T[]): T[] {
  const seen = new Set<string>();
  return acts.filter((act) => {
    const keys = [
      `id:${act.id}`,
      `t:${normalizeForSearch(act.title)}|${act.startDate}|${act.startTime ?? ""}`,
    ];
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

const countedEnd = (act: FestaMajorAct): string =>
  dayNumber(act.endDate) - dayNumber(act.startDate) <= MAX_COUNTED_SPAN_DAYS
    ? act.endDate
    : act.startDate;

function toEdition(
  name: FestaMajorName,
  acts: FestaMajorAct[],
): FestaMajorEdition {
  const sorted = [...acts].sort(compareActs);
  return {
    ...name,
    start: sorted[0].startDate,
    end: sorted.map(countedEnd).reduce((a, b) => (b > a ? b : a)),
    acts: sorted,
  };
}

const isWithin = (date: string, edition: FestaMajorEdition): boolean =>
  dayNumber(date) >= dayNumber(edition.start) - 1 &&
  dayNumber(date) <= dayNumber(edition.end) + 1;

/**
 * Splits acts into runs where each act starts at most CLUSTER_GAP_DAYS after
 * the run's latest start and at most `maxSpanDays` after its first.
 */
function clusterByTime(
  acts: FestaMajorAct[],
  maxSpanDays = Number.POSITIVE_INFINITY,
): FestaMajorAct[][] {
  const clusters: FestaMajorAct[][] = [];
  let latest = Number.NEGATIVE_INFINITY;
  let first = Number.NEGATIVE_INFINITY;
  for (const act of [...acts].sort(compareActs)) {
    const day = dayNumber(act.startDate);
    if (
      clusters.length === 0 ||
      day - latest > CLUSTER_GAP_DAYS ||
      day - first > maxSpanDays
    ) {
      clusters.push([]);
      first = day;
    }
    clusters[clusters.length - 1].push(act);
    latest = Math.max(latest, day);
  }
  return clusters;
}

/**
 * Groups one town's acts of one year into festes. Named acts ("Festa Major de
 * Sant Roc") group by name; an unnamed act ("Festa Major 2026: pregó") joins a
 * named festa only when its date falls inside exactly one of them, otherwise
 * it belongs to the town's own festa major of that time of year.
 */
export function groupEditions(
  acts: FestaMajorAct[],
  townLabel: string,
): FestaMajorEdition[] {
  const names = new Map(
    acts.map((act) => [act.id, extractFestaName(act.title, townLabel)]),
  );
  const canonical = consolidateKeys([...names.values()].map((n) => n.key));
  // Canonical keys are always raw keys, so each has its own label.
  const labels = new Map<string, string | null>();
  for (const name of names.values()) {
    if (name.key && !labels.has(name.key)) labels.set(name.key, name.label);
  }

  const editions: FestaMajorEdition[] = [];
  for (const cluster of clusterByTime(acts)) {
    const named = new Map<string, FestaMajorAct[]>();
    const unnamed: FestaMajorAct[] = [];
    for (const act of cluster) {
      const raw = names.get(act.id)?.key ?? "";
      const key = canonical.get(raw) ?? raw;
      if (!key) unnamed.push(act);
      else named.set(key, [...(named.get(key) ?? []), act]);
    }
    const namedEditions = [...named].map(([key, group]) =>
      toEdition({ key, label: labels.get(key) ?? null }, group),
    );
    const leftover: FestaMajorAct[] = [];
    for (const act of unnamed) {
      const hosts = namedEditions.filter((e) => isWithin(act.startDate, e));
      if (hosts.length === 1) hosts[0].acts.push(act);
      else leftover.push(act);
    }
    editions.push(
      ...namedEditions.map(({ key, label, acts: group }) =>
        toEdition({ key, label }, group),
      ),
      ...clusterByTime(leftover, MAX_UNNAMED_SPAN_DAYS).map((group) =>
        toEdition({ key: "", label: null }, group),
      ),
    );
  }
  return editions.sort(
    (a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key),
  );
}

export const summarizeEdition = ({
  acts,
  ...rest
}: FestaMajorEdition): FestaMajorEditionSummary => {
  const imageUrl = acts.find((act) => act.imageUrl)?.imageUrl;
  return { ...rest, count: acts.length, ...(imageUrl ? { imageUrl } : {}) };
};

/** The festa with most acts; ties go to the earliest. */
export function mainEdition<
  T extends FestaMajorEditionSummary | FestaMajorEdition,
>(editions: T[]): T | null {
  const size = (e: T) => ("count" in e ? e.count : e.acts.length);
  return editions.reduce<T | null>(
    (best, e) => (!best || size(e) > size(best) ? e : best),
    null,
  );
}

/**
 * This year once its programme is out (enough acts, or as many as last year);
 * until then last year's, so a hub isn't thin or empty in spring.
 */
export function pickYear(
  currentYear: number,
  currentCount: number,
  previousCount: number,
): FestaMajorYearChoice {
  const isCurrentYear =
    currentCount >= Math.min(previousCount, FESTA_MAJOR_MIN_INDEXABLE_ACTS);
  return {
    currentYear,
    year: isCurrentYear ? currentYear : currentYear - 1,
    isCurrentYear,
  };
}

/** Groups acts by start day, in order. */
export function groupByDay<T extends FestaMajorAct>(
  acts: T[],
): [string, T[]][] {
  const days = new Map<string, T[]>();
  for (const act of [...acts].sort(compareActs)) {
    days.set(act.startDate, [...(days.get(act.startDate) ?? []), act]);
  }
  return [...days];
}

export const yearRange = (year: number): { from: string; to: string } => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`,
});

/** The Madrid year of a YYYY-MM-DD date string. */
export const yearOf = (date: string): number => Number(date.slice(0, 4));

/** The API matches events that overlap the year; keep the ones that start in it. */
export const startingIn = <T extends FestaMajorAct>(
  acts: T[],
  year: number,
): T[] => acts.filter((act) => yearOf(act.startDate) === year);

const capitalize = (value: string): string =>
  value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** "Dissabte, 15 d’agost" for a YYYY-MM-DD date, in any server time zone. */
export const formatDayHeading = (date: string, locale: string): string =>
  capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`)),
  );

/** "Agost" for a YYYY-MM-DD date. */
export const formatMonthHeading = (date: string, locale: string): string =>
  capitalize(
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(`${date}T12:00:00Z`),
    ),
  );
