/**
 * Tests for DATE_RANGE_SHORTCUTS and toYMD helper
 */
import { describe, test, expect, vi, afterEach } from "vitest";
import { DATE_RANGE_SHORTCUTS } from "../utils/constants";

describe("DATE_RANGE_SHORTCUTS", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("all shortcuts have required properties", () => {
    expect(DATE_RANGE_SHORTCUTS).toHaveLength(3);
    DATE_RANGE_SHORTCUTS.forEach((shortcut) => {
      expect(shortcut.labelKey).toBeDefined();
      expect(shortcut.getRange).toBeInstanceOf(Function);
    });
  });

  test("all shortcuts return from/to YYYY-MM-DD strings", () => {
    DATE_RANGE_SHORTCUTS.forEach((shortcut) => {
      const { from, to } = shortcut.getRange();
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  test("all shortcuts have to >= from", () => {
    DATE_RANGE_SHORTCUTS.forEach((shortcut) => {
      const { from, to } = shortcut.getRange();
      expect(to >= from).toBe(true);
    });
  });

  describe("nextWeek", () => {
    const nextWeekShortcut = DATE_RANGE_SHORTCUTS.find(
      (s) => s.labelKey === "nextWeek",
    )!;

    test("exists", () => {
      expect(nextWeekShortcut).toBeDefined();
    });

    test("returns Monday-Sunday of following week", () => {
      // Fix date to Wednesday March 11, 2026 (UTC noon avoids timezone day-shift)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-11T12:00:00Z"));

      const { from, to } = nextWeekShortcut.getRange();
      // Next Monday = March 16, Next Sunday = March 22
      expect(from).toBe("2026-03-16");
      expect(to).toBe("2026-03-22");
    });

    test("returns correct range when today is Sunday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

      const { from, to } = nextWeekShortcut.getRange();
      // Next Monday = March 16, Next Sunday = March 22
      expect(from).toBe("2026-03-16");
      expect(to).toBe("2026-03-22");
    });

    test("returns correct range when today is Saturday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

      const { from, to } = nextWeekShortcut.getRange();
      // Next Monday = March 16, Next Sunday = March 22
      expect(from).toBe("2026-03-16");
      expect(to).toBe("2026-03-22");
    });

    test("returns correct range when today is Monday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-09T12:00:00Z"));

      const { from, to } = nextWeekShortcut.getRange();
      // Next Monday = March 16, Next Sunday = March 22
      expect(from).toBe("2026-03-16");
      expect(to).toBe("2026-03-22");
    });
  });

  describe("thisMonth", () => {
    const thisMonthShortcut = DATE_RANGE_SHORTCUTS.find(
      (s) => s.labelKey === "thisMonth",
    )!;

    test("exists", () => {
      expect(thisMonthShortcut).toBeDefined();
    });

    test("returns today through end of month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));

      const { from, to } = thisMonthShortcut.getRange();
      expect(from).toBe("2026-03-07");
      expect(to).toBe("2026-03-31");
    });

    test("handles last day of month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));

      const { from, to } = thisMonthShortcut.getRange();
      expect(from).toBe("2026-03-31");
      expect(to).toBe("2026-03-31");
    });

    test("handles February (non-leap year)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-10T12:00:00Z"));

      const { from, to } = thisMonthShortcut.getRange();
      expect(from).toBe("2026-02-10");
      expect(to).toBe("2026-02-28");
    });

    test("handles February (leap year)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2028-02-10T12:00:00Z"));

      const { from, to } = thisMonthShortcut.getRange();
      expect(from).toBe("2028-02-10");
      expect(to).toBe("2028-02-29");
    });
  });

  describe("nextMonth", () => {
    const nextMonthShortcut = DATE_RANGE_SHORTCUTS.find(
      (s) => s.labelKey === "nextMonth",
    )!;

    test("exists", () => {
      expect(nextMonthShortcut).toBeDefined();
    });

    test("returns first through last day of next month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));

      const { from, to } = nextMonthShortcut.getRange();
      expect(from).toBe("2026-04-01");
      expect(to).toBe("2026-04-30");
    });

    test("handles December (wraps to January of next year)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-12-15T12:00:00Z"));

      const { from, to } = nextMonthShortcut.getRange();
      expect(from).toBe("2027-01-01");
      expect(to).toBe("2027-01-31");
    });

    test("handles January to February", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-20T12:00:00Z"));

      const { from, to } = nextMonthShortcut.getRange();
      expect(from).toBe("2026-02-01");
      expect(to).toBe("2026-02-28");
    });
  });
});
