import type {
  EventTemporalStatus,
  EventStatusLabels,
} from "types/event-status";
import {
  daysBetween,
  madridWallClockMs,
  resolveEventWindow,
  wallClockDay,
  wallClockMs,
} from "@utils/event-window";
import localeLabels from "../i18n/locale-labels.generated.json";

const defaultLabels: EventStatusLabels = localeLabels.utils
  .EventStatus as EventStatusLabels;

const COUNT_PLACEHOLDER = "{count}";

export const buildEventStatusLabels = (
  translate: (
    key: keyof EventStatusLabels,
    values?: Record<string, string | number | Date>,
  ) => string,
): EventStatusLabels => ({
  past: translate("past"),
  live: translate("live"),
  upcoming: translate("upcoming"),
  endsInDays: translate("endsInDays", { count: COUNT_PLACEHOLDER }),
  endsInHours: translate("endsInHours", { count: COUNT_PLACEHOLDER }),
  endsSoon: translate("endsSoon"),
  startsInDays: translate("startsInDays", { count: COUNT_PLACEHOLDER }),
  startsInHours: translate("startsInHours", { count: COUNT_PLACEHOLDER }),
  startsToday: translate("startsToday"),
  today: translate("today"),
});

const formatCount = (template: string, count: number) =>
  template.replace("{count}", count.toString());

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Compute temporal status of an event given start & optional end date.
 * Adds an optional `nowOverride` for deterministic testing.
 *
 * Everything is compared in Madrid wall-clock time (`resolveEventWindow`),
 * so the result is the same on a UTC server and in any visitor's browser.
 *
 * Rules:
 *  - All day ("Consultar horaris"): live from its first day to its last.
 *  - Timed, with an end time: live from start to end (overnight ends the next day).
 *  - Timed, no end time, ending on a later day: live until that day is over.
 *  - Timed, no end time, one day: live for 24 h after the start.
 *  - upcoming: future start (granularity: days, hours, today)
 */
export function computeTemporalStatus(
  startDate: string,
  endDate?: string,
  nowOverride?: Date,
  startTime?: string | null,
  endTime?: string | null,
  labels: EventStatusLabels = defaultLabels,
): EventTemporalStatus {
  const window = resolveEventWindow({ startDate, endDate, startTime, endTime });
  if (!window) return { state: "upcoming", label: labels.upcoming };

  const now = madridWallClockMs(nowOverride ?? new Date());
  const { startDay, endDay } = window;

  if (window.isAllDay) {
    const today = wallClockDay(now);
    const lastDay = endDay ?? startDay;
    if (today > lastDay) {
      return { state: "past", label: labels.past, endedOn: lastDay };
    }
    if (today >= startDay) {
      const days = daysBetween(today, lastDay);
      return days > 0
        ? {
            state: "live",
            label: labels.live,
            endsIn: formatCount(labels.endsInDays, days),
          }
        : { state: "live", label: labels.live };
    }
    return {
      state: "upcoming",
      label: labels.upcoming,
      startsIn: formatCount(labels.startsInDays, daysBetween(today, startDay)),
    };
  }

  const start = wallClockMs(startDay, window.startTime ?? "00:00");
  // A timed event with no end time that ends on a later day (an exhibition
  // "from 19:00") runs until the end of that day, not 24 h after it starts.
  const end =
    endDay && window.endTime
      ? wallClockMs(endDay, window.endTime)
      : endDay && endDay > startDay
        ? wallClockMs(endDay, "23:59:59")
        : undefined;

  if (
    (end !== undefined && now > end) ||
    (end === undefined && now - start > DAY_MS)
  ) {
    return { state: "past", label: labels.past, endedOn: endDay ?? startDay };
  }

  if (now >= start) {
    if (end === undefined) return { state: "live", label: labels.live };
    const hours = Math.floor((end - now) / HOUR_MS);
    const days = Math.floor(hours / 24);
    if (days > 0)
      return {
        state: "live",
        label: labels.live,
        endsIn: formatCount(labels.endsInDays, days),
      };
    if (hours > 0)
      return {
        state: "live",
        label: labels.live,
        endsIn: formatCount(labels.endsInHours, hours),
      };
    return { state: "live", label: labels.live, endsIn: labels.endsSoon };
  }

  const hoursUntil = Math.floor((start - now) / HOUR_MS);
  const daysUntil = Math.floor(hoursUntil / 24);
  if (daysUntil > 0) {
    return {
      state: "upcoming",
      label: labels.upcoming,
      startsIn: formatCount(labels.startsInDays, daysUntil),
    };
  }
  if (hoursUntil > 0) {
    return {
      state: "upcoming",
      label: labels.upcoming,
      startsIn: formatCount(labels.startsInHours, hoursUntil),
    };
  }
  return {
    state: "upcoming",
    label: labels.today,
    startsIn: labels.startsToday,
  };
}
