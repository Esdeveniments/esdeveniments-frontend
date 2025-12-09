import type {
  EventTemporalStatus,
  EventStatusLabels,
} from "types/event-status";
import { normalizeEndTime } from "@utils/date-helpers";
import caMessages from "../messages/ca.json";

const defaultLabels: EventStatusLabels = (caMessages as any).Utils
  .EventStatus as EventStatusLabels;

const COUNT_PLACEHOLDER = "{count}";

export const buildEventStatusLabels = (
  translate: (
    key: keyof EventStatusLabels,
    values?: Record<string, string | number | Date>
  ) => string
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

/**
 * Compute temporal status of an event given start & optional end date.
 * Adds an optional `nowOverride` for deterministic testing.
 *
 * When startTime is "00:00" or null (meaning "Consultar horaris"), the event
 * is treated as an all-day event using date-level comparison (ignoring time).
 *
 * Rules:
 *  - past: endDate in past OR (no endDate and started >24h ago for timed events, or date in past for all-day events)
 *  - live: now between start and end (or after start if no end yet & within 24h, or same date for all-day events)
 *  - upcoming: future start (granularity: days, hours, today)
 */
export function computeTemporalStatus(
  startDate: string,
  endDate?: string,
  nowOverride?: Date,
  startTime?: string | null,
  endTime?: string | null,
  labels: EventStatusLabels = defaultLabels
): EventTemporalStatus {
  // Treat identical start/end times as "no end time" to avoid zero-length windows
  const normalizedEndTime = normalizeEndTime(startTime, endTime);

  const now = nowOverride ? new Date(nowOverride) : new Date();

  // Helper to construct a Date from date and time strings
  const buildDateTime = (date: string, time?: string | null): Date => {
    if (time && time.trim().length > 0) {
      // Combine date and time as local time: "2025-11-08" + "10:00" -> local "2025-11-08T10:00"
      return new Date(`${date}T${time}`);
    }
    // If date is a bare date (YYYY-MM-DD), parse as local midnight.
    // Otherwise, delegate to Date parsing (handles full ISO with timezone/Z).
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00`);
    }
    return new Date(date);
  };

  // Check if this is an all-day event (no specific time, i.e., "Consultar horaris")
  // Only treat as all-day if startTime is explicitly provided and is "00:00" or null
  const isAllDayEvent =
    startTime !== undefined && (!startTime || startTime === "00:00");

  const start = buildDateTime(startDate, startTime);
  const endDateHasTime = typeof endDate === "string" && endDate.includes("T");
  const shouldBuildEnd =
    Boolean(endDate) &&
    (isAllDayEvent ||
      endDateHasTime ||
      (normalizedEndTime && normalizedEndTime.trim().length > 0));
  const end =
    shouldBuildEnd && endDate
      ? buildDateTime(endDate, normalizedEndTime)
      : undefined;

  // Helper to compare dates at day-level (ignoring time)
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isBeforeDay = (date1: Date, date2: Date) => {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1 < d2;
  };

  // For all-day events, use date-level comparison
  if (isAllDayEvent) {
    // Past: end date is before today, or (no end date and start date is before today)
    if (end && isBeforeDay(end, now)) {
      return {
        state: "past",
        label: labels.past,
        endedOn: end.toISOString().split("T")[0],
      };
    }
    if (!end && isBeforeDay(start, now)) {
      return {
        state: "past",
        label: labels.past,
        endedOn: start.toISOString().split("T")[0],
      };
    }

    // Live: today is within [start, end] range (or equals start if no end)
    if (isSameDay(start, now) || (end && isSameDay(end, now))) {
      if (end && !isSameDay(start, end)) {
        const diffMs = end.getTime() - now.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (days > 0) {
          return {
            state: "live",
            label: labels.live,
            endsIn: formatCount(labels.endsInDays, days),
          };
        }
      }
      return { state: "live", label: labels.live };
    }

    // Live: today is between start and end dates
    if (end && now > start && now < end) {
      const diffMs = end.getTime() - now.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days > 0) {
        return {
          state: "live",
          label: labels.live,
          endsIn: formatCount(labels.endsInDays, days),
        };
      }
      return { state: "live", label: labels.live };
    }

    // Upcoming: start date is in the future
    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = startDay.getTime() - nowDay.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days > 0) {
      return {
        state: "upcoming",
        label: labels.upcoming,
        startsIn: formatCount(labels.startsInDays, days),
      };
    }
    return {
      state: "upcoming",
      label: labels.today,
      startsIn: labels.startsToday,
    };
  }

  // For timed events, use the original timestamp-based logic
  // Past
  if (
    (end && now > end) ||
    (!end && now.getTime() - start.getTime() > 24 * 60 * 60 * 1000)
  ) {
    const endedOn = end
      ? end.toISOString().split("T")[0]
      : start.toISOString().split("T")[0];
    return { state: "past", label: labels.past, endedOn };
  }

  // Live
  if (now >= start && (!end || now <= end)) {
    if (end) {
      const diffMs = end.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
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
    return { state: "live", label: labels.live };
  }

  // Upcoming
  const diff = start.getTime() - now.getTime();
  const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
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
