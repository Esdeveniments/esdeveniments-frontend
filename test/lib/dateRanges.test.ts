import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDateRangeFromByDate, twoWeeksDefault } from "lib/dates";
import { toLocalDateString } from "@utils/helpers";
import type { DateRange } from "types/common";

const toApi = (range: DateRange | null) =>
  range && {
    from: toLocalDateString(range.from),
    to: toLocalDateString(range.until),
  };

const at = (iso: string, byDate: string) => {
  vi.setSystemTime(new Date(iso));
  return toApi(getDateRangeFromByDate(byDate));
};

describe.each(["UTC", "Europe/Madrid"])(
  "date ranges sent to the API (process TZ %s)",
  (tz) => {
    const originalTz = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = tz;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      process.env.TZ = originalTz;
    });

    it("avui is the Madrid day, not the next UTC day", () => {
      expect(at("2026-10-31T17:00:00Z", "avui")).toEqual({
        from: "2026-10-31",
        to: "2026-10-31",
      });
    });

    it("avui just after Madrid midnight is the new day", () => {
      expect(at("2026-10-31T23:30:00Z", "avui")).toEqual({
        from: "2026-11-01",
        to: "2026-11-01",
      });
    });

    it("dema just after Madrid midnight is the day after", () => {
      expect(at("2026-10-31T23:30:00Z", "dema")).toEqual({
        from: "2026-11-02",
        to: "2026-11-02",
      });
    });

    it("setmana runs from today to Sunday", () => {
      expect(at("2026-11-04T10:00:00Z", "setmana")).toEqual({
        from: "2026-11-04",
        to: "2026-11-08",
      });
    });

    it("setmana on a Sunday is only that Sunday", () => {
      expect(at("2026-11-08T10:00:00Z", "setmana")).toEqual({
        from: "2026-11-08",
        to: "2026-11-08",
      });
    });

    it("cap-de-setmana on a Wednesday is Friday to Sunday", () => {
      expect(at("2026-11-04T10:00:00Z", "cap-de-setmana")).toEqual({
        from: "2026-11-06",
        to: "2026-11-08",
      });
    });

    it("cap-de-setmana just after Madrid midnight on Sunday is only Sunday", () => {
      expect(at("2026-10-31T23:30:00Z", "cap-de-setmana")).toEqual({
        from: "2026-11-01",
        to: "2026-11-01",
      });
    });

    it("twoWeeksDefault starts on the Madrid day", () => {
      vi.setSystemTime(new Date("2026-10-31T23:30:00Z"));
      expect(toApi(twoWeeksDefault())).toEqual({
        from: "2026-11-01",
        to: "2026-11-15",
      });
    });
  },
);
