import { MONTHS_URL as MONTHS } from "@utils/constants";
import { nextDay, isWeekend } from "@utils/helpers";
import { DateRange } from "types/common";

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

/**
 * Returns date range for today
 */
export const today = (): DateRange => {
  const from = new Date();
  const until = new Date();

  until.setHours(24);
  until.setMinutes(0);
  until.setSeconds(0);

  return { from, until };
};

/**
 * Returns date range for tomorrow
 */
export const tomorrow = (): DateRange => {
  const from = new Date();
  from.setDate(from.getDate() + 1); // set the date to tomorrow
  const until = new Date(from.getTime()); // copy the date object

  until.setHours(24);
  until.setMinutes(0);
  until.setSeconds(0);

  return { from, until };
};

/**
 * Returns date range for the current week
 */
export const week = (): DateRange => {
  const from = new Date();
  const until = nextDay(0);

  until.setHours(24);
  until.setMinutes(0);
  until.setSeconds(0);

  return { from, until };
};

/**
 * Returns date range for the weekend
 */
export const weekend = (): DateRange => {
  let from = nextDay(5);

  if (isWeekend()) {
    from = new Date();
  } else {
    from.setHours(6);
    from.setMinutes(0);
    from.setSeconds(0);
  }

  const until = nextDay(0);

  until.setHours(24);
  until.setMinutes(0);
  until.setSeconds(0);

  return { from, until };
};

/**
 * Returns date range for the next two weeks
 */
export const twoWeeksDefault = (): DateRange => {
  const now = new Date();
  const from = new Date();
  const until = new Date(now.setDate(now.getDate() + 14));

  return { from, until };
};

/**
 * Returns date range for a specific month and year
 * @param {string} month - Month name in Catalan
 * @param {number} year - Year
 */
export const getHistoricDates = (month: string, year: number): DateRange => {
  const getMonth = MONTHS.indexOf(month);
  if (getMonth === -1) {
    throw new Error(`Invalid month: ${month}`);
  }

  const from = new Date(year, getMonth, 1, 2, 0, 0);
  const until = new Date(year, getMonth + 1, 0, 24, 59, 59);

  return { from, until };
};

/**
 * Returns an array of years from 2023 to current year
 * @returns {number[]} Array of years
 */
export const getAllYears = (): number[] => {
  const currentYear = new Date().getFullYear();

  return Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => currentYear - i
  );
};
