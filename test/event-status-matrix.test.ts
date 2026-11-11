import { afterEach, describe, expect, it } from "vitest";
import { computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";

// Every case is written in Madrid wall-clock time, the time the backend sends.
// The suite runs under several runtime time zones: the server runs in UTC.
const madrid = (wallClock: string): Date => {
  const offset = wallClock < "2025-10-26T03:00" ? "+02:00" : "+01:00";
  return new Date(`${wallClock}:00${offset}`);
};

type Case = {
  name: string;
  now: string;
  startDate: string;
  endDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  state: EventTemporalStatus["state"];
  detail?: RegExp;
};

const detailOf = (status: EventTemporalStatus): string =>
  status.state === "live"
    ? (status.endsIn ?? "")
    : status.state === "upcoming"
      ? (status.startsIn ?? "")
      : status.endedOn;

// "now" is Friday 2025-10-10 unless a case needs another moment.
const cases: Case[] = [
  // Timed, single day, no end time: live for 24 h after the start.
  { name: "starts later today", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "19:00", state: "upcoming", detail: /^7 hours$/ },
  { name: "started this morning", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "10:00", state: "live" },
  { name: "started yesterday less than 24 h ago", now: "2025-10-10T12:00", startDate: "2025-10-09", startTime: "13:00", state: "live" },
  { name: "started more than 24 h ago", now: "2025-10-10T12:00", startDate: "2025-10-09", startTime: "11:00", state: "past" },
  { name: "times with seconds", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "10:00:00", endDate: "2025-10-10", endTime: "14:00:00", state: "live", detail: /^2 hours$/ },

  // Timed with an end time.
  { name: "between start and end time", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "10:00", endTime: "14:00", state: "live" },
  { name: "after the end time", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "08:00", endTime: "11:00", state: "past", detail: /^2025-10-10$/ },
  { name: "end time with no end date", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "08:00", endTime: "11:00", state: "past" },
  { name: "same start and end time counts as no end time", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "10:00", endTime: "10:00", state: "live" },

  // Overnight: the end time is on the next day even when the end date repeats the start date.
  { name: "overnight, before it starts", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "22:00", endTime: "02:00", state: "upcoming" },
  { name: "overnight, after midnight", now: "2025-10-11T01:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "22:00", endTime: "02:00", state: "live", detail: /^1 hours$/ },
  { name: "overnight, over", now: "2025-10-11T03:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "22:00", endTime: "02:00", state: "past", detail: /^2025-10-11$/ },
  { name: "ends at midnight", now: "2025-10-10T23:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "22:00", endTime: "00:00", state: "live" },

  // Timed, several days.
  { name: "several days, no end time, running", now: "2025-10-10T12:00", startDate: "2025-10-01", endDate: "2025-10-20", startTime: "19:00", state: "live", detail: /^10 days$/ },
  { name: "several days, no end time, last day", now: "2025-10-10T23:00", startDate: "2025-10-01", endDate: "2025-10-10", startTime: "19:00", state: "live" },
  { name: "several days, no end time, over", now: "2025-10-11T00:30", startDate: "2025-10-01", endDate: "2025-10-10", startTime: "19:00", state: "past", detail: /^2025-10-10$/ },
  { name: "several days, before the first start time", now: "2025-10-01T12:00", startDate: "2025-10-01", endDate: "2025-10-20", startTime: "19:00", state: "upcoming" },
  { name: "several days ending at 00:00 run all of the last day", now: "2025-10-10T12:00", startDate: "2025-10-01", endDate: "2025-10-10", startTime: "19:00", endTime: "00:00", state: "live" },
  { name: "the same time on a later end day is a real end", now: "2025-10-11T19:30", startDate: "2025-10-10", endDate: "2025-10-11", startTime: "19:00", endTime: "19:00", state: "past" },
  { name: "several days with an end time, last hours", now: "2025-10-10T12:00", startDate: "2025-10-01", endDate: "2025-10-10", startTime: "19:00", endTime: "15:00", state: "live", detail: /^3 hours$/ },

  // Bad data: an end date before the start date is ignored.
  { name: "end date before start date", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-05", startTime: "10:00", state: "live" },
  { name: "end date before start date, all day", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-05", startTime: null, state: "live" },

  // All day ("Consultar horaris"): null, empty or midnight start time.
  { name: "all day today (null)", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: null, state: "live" },
  { name: "all day today (empty)", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "", state: "live" },
  { name: "all day today (00:00)", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "00:00", state: "live" },
  { name: "all day tomorrow (00:00:00)", now: "2025-10-10T12:00", startDate: "2025-10-11", startTime: "00:00:00", state: "upcoming", detail: /^1 days$/ },
  { name: "all day yesterday", now: "2025-10-10T12:00", startDate: "2025-10-09", startTime: null, state: "past", detail: /^2025-10-09$/ },
  { name: "all day yesterday, just after midnight", now: "2025-10-10T00:30", startDate: "2025-10-09", startTime: null, state: "past" },
  { name: "all day today, just after midnight", now: "2025-10-10T00:30", startDate: "2025-10-10", startTime: null, state: "live" },
  { name: "all day, several days, running", now: "2025-10-10T12:00", startDate: "2025-10-08", endDate: "2025-10-12", startTime: null, state: "live" },
  { name: "all day, several days, last day", now: "2025-10-12T23:30", startDate: "2025-10-08", endDate: "2025-10-12", startTime: null, state: "live" },
  { name: "all day, several days, over", now: "2025-10-13T00:30", startDate: "2025-10-08", endDate: "2025-10-12", startTime: null, state: "past", detail: /^2025-10-12$/ },

  // The night the clocks go back (2025-10-26, 03:00 → 02:00).
  { name: "all day on the clock-change day, late evening", now: "2025-10-26T23:30", startDate: "2025-10-26", startTime: null, state: "live" },
  { name: "all day on the clock-change day, next day", now: "2025-10-27T00:30", startDate: "2025-10-26", startTime: null, state: "past" },
  { name: "overnight across the clock change", now: "2025-10-26T01:30", startDate: "2025-10-25", endDate: "2025-10-25", startTime: "22:00", endTime: "04:00", state: "live" },

  // Bad times are ignored rather than producing an invalid date.
  { name: "an invalid start time counts as all day", now: "2025-10-10T12:00", startDate: "2025-10-10", startTime: "25:00", state: "live" },
  { name: "an end time with trailing text counts as no end time", now: "2025-10-10T15:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "10:00", endTime: "14:00junk", state: "live" },
  { name: "an impossible start date is treated as unknown", now: "2025-10-10T12:00", startDate: "2025-02-30", startTime: "10:00", state: "upcoming" },
  { name: "an invalid end time counts as no end time", now: "2025-10-10T12:00", startDate: "2025-10-10", endDate: "2025-10-10", startTime: "10:00", endTime: "xx", state: "live" },

  // Full timestamps with an offset, as some endpoints send them.
  { name: "full timestamps", now: "2025-10-10T12:00", startDate: "2025-10-10T10:00:00+02:00", endDate: "2025-10-10T14:00:00+02:00", state: "live", detail: /^2 hours$/ },
  { name: "a UTC timestamp is read in Madrid time", now: "2025-10-10T01:00", startDate: "2025-10-09T22:30:00Z", startTime: null, state: "live" },
  { name: "full timestamp start plus a start time", now: "2025-10-10T12:00", startDate: "2025-10-10T00:00:00", startTime: "10:00", state: "live" },
];

const labels = {
  past: "past",
  live: "live",
  upcoming: "upcoming",
  endsInDays: "{count} days",
  endsInHours: "{count} hours",
  endsSoon: "soon",
  startsInDays: "{count} days",
  startsInHours: "{count} hours",
  startsToday: "today",
  today: "today",
};

const run = (c: Case) =>
  computeTemporalStatus(
    c.startDate,
    c.endDate,
    madrid(c.now),
    c.startTime,
    c.endTime,
    labels,
  );

const originalTz = process.env.TZ;

describe.each(["Europe/Madrid", "UTC", "America/New_York", "Asia/Tokyo"])(
  "computeTemporalStatus in a %s runtime",
  (tz) => {
    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it.each(cases)("$name → $state", (c) => {
      process.env.TZ = tz;
      const status = run(c);
      expect(status.state).toBe(c.state);
      if (c.detail) expect(detailOf(status)).toMatch(c.detail);
    });

    // Whatever the times, a multi-day event is live on every day strictly
    // between its first and last day, and past from the day after its last.
    it.each([null, "00:00", "09:00", "19:00:00", "23:30"])(
      "a multi-day event with start time %s is live in between and past after",
      (startTime) => {
        process.env.TZ = tz;
        for (const endTime of [null, "00:00", "01:00", "18:00"]) {
          for (let hour = 0; hour < 24; hour++) {
            const hh = String(hour).padStart(2, "0");
            const status = (now: string) =>
              computeTemporalStatus("2025-10-08", "2025-10-12", madrid(now), startTime, endTime, labels).state;
            expect(status(`2025-10-09T${hh}:00`), `${startTime}-${endTime} @09 ${hh}`).toBe("live");
            expect(status(`2025-10-11T${hh}:00`), `${startTime}-${endTime} @11 ${hh}`).toBe("live");
            expect(status(`2025-10-14T${hh}:00`), `${startTime}-${endTime} @14 ${hh}`).toBe("past");
          }
        }
      },
    );
  },
);
