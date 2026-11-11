import { TIMEZONE_MADRID } from "@utils/constants";
import type { EventWindow, EventWindowInput } from "types/event-status";

const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T ](.+))?$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;
const OFFSET_PATTERN = /T.*(Z|[+-]\d{2}:?\d{2})$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

const madridFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE_MADRID,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const toMadridParts = (instant: Date) => {
  const parts = Object.fromEntries(
    madridFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    seconds: parts.second,
  };
};

/**
 * An instant as Madrid wall-clock milliseconds: a timestamp whose UTC fields
 * read as the time in Madrid. Compare it with `wallClockMs` values only.
 */
export const madridWallClockMs = (instant: Date): number => {
  const { day, time, seconds } = toMadridParts(instant);
  return Date.parse(`${day}T${time}:${seconds}Z`);
};

/** A Madrid wall-clock day and "HH:mm" time as wall-clock milliseconds. */
export const wallClockMs = (day: string, time: string): number =>
  Date.parse(`${day}T${time}Z`);

export const wallClockDay = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/** Whole calendar days from `from` to `to` ("YYYY-MM-DD"). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((wallClockMs(to, "00:00") - wallClockMs(from, "00:00")) / DAY_MS);

const cleanTime = (value?: string | null): string | null => {
  const match = value ? TIME_PATTERN.exec(value.trim()) : null;
  return match ? `${match[1]}:${match[2]}` : null;
};

const isCalendarDay = (day: string): boolean => {
  // Date.parse rolls "2025-02-30" over to March and rejects "2025-01-32".
  const ms = wallClockMs(day, "00:00");
  return !Number.isNaN(ms) && wallClockDay(ms) === day;
};

/**
 * Splits a backend date into a Madrid day and time. A value with an offset
 * ("…+02:00", "…Z") is converted to Madrid; a bare one is Madrid already.
 * Midnight inside a date value means "no time", as the backend sends it.
 */
const splitDate = (
  value?: string | null,
): { day: string | null; time: string | null } => {
  const trimmed = value?.trim() ?? "";
  const match = DATE_PATTERN.exec(trimmed);
  if (!match || !isCalendarDay(match[1])) return { day: null, time: null };
  if (OFFSET_PATTERN.test(trimmed)) {
    const instant = new Date(trimmed);
    if (!Number.isNaN(instant.getTime())) {
      const { day, time } = toMadridParts(instant);
      return { day, time: time === "00:00" ? null : time };
    }
  }
  const time = cleanTime(match[2]);
  return {
    day: match[1],
    time: time === "00:00" ? null : time,
  };
};

/**
 * Resolves an event's raw date and time fields into one window, so the
 * status pill, card lists and JSON-LD agree on when it starts and ends.
 *
 * - A start time of "00:00" or none at all ("Consultar horaris") is all day.
 * - Times keep only "HH:mm". An end time equal to the start time on the same
 *   day is no end; so is "00:00" on a later end day.
 * - An end time with no end date ends on the start day.
 * - An end date before the start date is ignored (bad data).
 * - An end time at or before the start time on the same day is overnight:
 *   22:00–02:00 ends at 02:00 the next day.
 *
 * Returns null when the start date is not a real "YYYY-MM-DD" day.
 */
export function resolveEventWindow({
  startDate,
  endDate,
  startTime,
  endTime,
}: EventWindowInput): EventWindow | null {
  const start = splitDate(startDate);
  if (!start.day) return null;

  const explicitStart =
    startTime === undefined ? start.time : cleanTime(startTime);
  const isAllDay =
    startTime !== undefined && (!explicitStart || explicitStart === "00:00");
  const resolvedStartTime = isAllDay ? null : (explicitStart ?? "00:00");

  const end = splitDate(endDate);
  let resolvedEndTime = isAllDay
    ? null
    : endTime === undefined
      ? end.time
      : cleanTime(endTime);

  let endDay = end.day;
  if (endDay && endDay < start.day) {
    endDay = null;
    resolvedEndTime = null;
  }
  const endsLater = !!endDay && endDay > start.day;
  // On the start day an equal end time is no end; on a later day, "00:00"
  // is no end, as the date display reads it.
  if (
    endsLater ? resolvedEndTime === "00:00" : resolvedEndTime === resolvedStartTime
  ) {
    resolvedEndTime = null;
  }
  endDay ??= resolvedEndTime ? start.day : null;
  if (
    endDay === start.day &&
    resolvedEndTime &&
    resolvedStartTime &&
    resolvedEndTime < resolvedStartTime
  ) {
    endDay = wallClockDay(wallClockMs(start.day, "00:00") + DAY_MS);
  }

  return {
    startDay: start.day,
    startTime: resolvedStartTime,
    endDay,
    endTime: resolvedEndTime,
    isAllDay,
  };
}

/**
 * When a timed event ends, in wall-clock ms. With no end time, a later end
 * day runs to its end ("from 19:00" exhibitions); undefined means one day,
 * which counts as over 24 h after it starts.
 */
export function timedEventEndMs(window: EventWindow): number | undefined {
  const { startDay, endDay, endTime } = window;
  if (endDay && endTime) return wallClockMs(endDay, endTime);
  if (endDay && endDay > startDay) return wallClockMs(endDay, "23:59:59");
  return undefined;
}

/** Whether the event is over at `nowMs` (from `madridWallClockMs`). */
export function isWindowOver(window: EventWindow, nowMs: number): boolean {
  if (window.isAllDay) {
    return wallClockDay(nowMs) > (window.endDay ?? window.startDay);
  }
  const end = timedEventEndMs(window);
  if (end !== undefined) return nowMs > end;
  return (
    nowMs - wallClockMs(window.startDay, window.startTime ?? "00:00") > DAY_MS
  );
}

/**
 * Whether an event has ended, by the same rules as `computeTemporalStatus`,
 * without its labels (keeps client bundles small). Unparseable dates: false.
 */
export function hasEventEnded(
  input: EventWindowInput,
  now = new Date(),
): boolean {
  const window = resolveEventWindow(input);
  return window ? isWindowOver(window, madridWallClockMs(now)) : false;
}
