import {
  MONTHS_URL as MONTHS,
  DEFAULT_FILTER_VALUE,
  getMonthUrlNames,
  TIMEZONE_MADRID,
} from "@utils/constants";
import { DateRange } from "types/common";
import type { ValidDateSlug } from "types/dates";

/**
 * Normalize a month parameter coming from URLs.
 * - Decodes URI components
 * - Lowercases
 * - Maps display label (març) while keeping slug-safe value (marc)
 */
export const normalizeMonthParam = (
  rawMonth: string
): { slug: string; label: string } => {
  const decoded = decodeURIComponent(rawMonth).toLowerCase();
  const slug = decoded === "març" ? "marc" : decoded;
  const label = slug === "marc" ? "març" : decoded;
  return { slug, label };
};

export const resolveMonthIndexFromSlug = (rawMonth: string): number | null => {
  const targetSlug = normalizeMonthParam(rawMonth).slug;

  const resolveIndex = (list: string[]) =>
    list.findIndex(
      (candidate) => normalizeMonthParam(candidate).slug === targetSlug
    );

  const listsToTry: string[][] = [
    MONTHS,
    getMonthUrlNames("es"),
    getMonthUrlNames("en"),
  ];

  for (const list of listsToTry) {
    const index = resolveIndex(list);
    if (index >= 0) return index;
  }

  return null;
};

// Valid date formats - this becomes the source of truth
export const VALID_DATES = [
  DEFAULT_FILTER_VALUE,
  "avui",
  "dema",
  "setmana",
  "cap-de-setmana",
] as const;

/**
 * Type guard to check if a string is a valid date slug
 */
export function isValidDateSlug(value: string): value is ValidDateSlug {
  return VALID_DATES.includes(value as ValidDateSlug);
}

/**
 * Returns whether the current date is in daylight saving time
 * @returns {number} 2 if in daylight saving time, 1 if not
 */
export const getDaylightSaving = (): number => {
  const date = new Date();
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) != date.getTimezoneOffset() ? 2 : 1;
};

// Ranges hold Madrid calendar days at 12:00 UTC, both ends inclusive, so
// toISOString() gives the Madrid date in any server or browser time zone.
const madridToday = (): Date => {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_MADRID,
  }).format(new Date());
  return new Date(`${ymd}T12:00:00Z`);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const daysUntilSunday = (date: Date): number => (7 - date.getUTCDay()) % 7;

export const today = (): DateRange => {
  const day = madridToday();
  return { from: day, until: day };
};

export const tomorrow = (): DateRange => {
  const day = addDays(madridToday(), 1);
  return { from: day, until: day };
};

export const week = (): DateRange => {
  const from = madridToday();
  return { from, until: addDays(from, daysUntilSunday(from)) };
};

/** Friday to Sunday; from today when today is already Friday, Saturday or Sunday. */
export const weekend = (): DateRange => {
  const now = madridToday();
  const weekday = now.getUTCDay();
  const from = weekday === 0 || weekday >= 5 ? now : addDays(now, 5 - weekday);
  return { from, until: addDays(now, daysUntilSunday(now)) };
};

export const twoWeeksDefault = (): DateRange => {
  const from = madridToday();
  return { from, until: addDays(from, 14) };
};

/**
 * Maps a byDate filter value to its corresponding date range function and returns the range
 * @param {string} byDate - The byDate filter value (avui, dema, setmana, cap-de-setmana, etc.)
 * @returns {DateRange | null} The date range for the given filter, or null if byDate is "tots"
 */
export const getDateRangeFromByDate = (byDate: string): DateRange | null => {
  if (byDate === DEFAULT_FILTER_VALUE) {
    return null;
  }

  const map: Record<string, () => DateRange> = {
    avui: today,
    dema: tomorrow,
    setmana: week,
    "cap-de-setmana": weekend,
  };

  const fn = map[byDate] || today;
  return fn();
};

/**
 * Returns date range for a specific month and year
 * @param {string} month - Month slug (locale-aware)
 * @param {number} year - Year
 * @param {string[]} monthsList - Optional month slug list in chronological order
 */
export const getHistoricDates = (
  month: string,
  year: number,
  monthsList: string[] = MONTHS
): DateRange => {
  const targetSlug = normalizeMonthParam(month).slug;
  const resolveIndex = (list: string[]) =>
    list.findIndex(
      (candidate) => normalizeMonthParam(candidate).slug === targetSlug
    );

  // Try provided list first, then default MONTHS, then multi-locale resolution
  const primaryIndex = resolveIndex(monthsList);
  const fallbackIndex = primaryIndex === -1 ? resolveIndex(MONTHS) : primaryIndex;
  const monthIndex = fallbackIndex === -1 
    ? resolveMonthIndexFromSlug(month) 
    : fallbackIndex;

  if (monthIndex === null || monthIndex === -1) {
    throw new Error(`Invalid month: ${month}`);
  }

  const from = new Date(year, monthIndex, 1, 2, 0, 0);
  const until = new Date(year, monthIndex + 1, 0, 24, 59, 59);

  return { from, until };
};

/**
 * Returns an array of years from 2023 to current year
 * @param {number} [overrideYear] - Optional year to use instead of current year
 * @returns {number[]} Array of years
 */
export const getAllYears = (overrideYear?: number): number[] => {
  const currentYear = overrideYear ?? new Date().getFullYear();

  return Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => currentYear - i
  );
};
