import { describe, expect, it, vi, afterEach } from "vitest";
import { getPublishDraftWarnings, hasPublishFormEnded } from "@utils/publish-draft-warnings";
import type { FormData } from "types/event";

afterEach(() => vi.useRealTimers());

describe("restored draft revalidation", () => {
  it("waits for option lists, flags expired/missing selections and never changes input", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 26, 12));
    const form: FormData = {
      title: "", description: "", startDate: "2026-10-25", endDate: "", startTime: "",
      endTime: "", location: "", url: "", region: null, town: { value: "7", label: "Old town" },
      categories: [3, { id: 4, name: "Old" }, { value: "5", label: "Other" }],
    };
    const original = structuredClone(form);
    expect(getPublishDraftWarnings(form, [], [], false, false)).toEqual(["date"]);
    expect(getPublishDraftWarnings(form, [], [], true, true)).toEqual(["date", "city", "category"]);
    const categories = ["3", "4", "5"].map((value) => ({ value, label: value }));
    expect(getPublishDraftWarnings(form, [{ value: "7", label: "Town" }], categories, true, true))
      .toEqual(["date"]);
    expect(form).toEqual(original);
  });
});

describe("hasPublishFormEnded", () => {
  const base: FormData = {
    title: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
    location: "", url: "", region: null, town: null, categories: [],
  };

  it("blocks only events whose last local day is before today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 0, 30));
    // Earlier today counts as today: a default 09:00 slot must not block a 15:00 publisher.
    expect(hasPublishFormEnded({ ...base, startDate: "2026-11-20T09:00", endDate: "2026-11-20T10:00" })).toBe(false);
    expect(hasPublishFormEnded({ ...base, startDate: "2026-11-19T09:00", endDate: "2026-11-19T10:00" })).toBe(true);
    // A run that started earlier but ends later is still on.
    expect(hasPublishFormEnded({ ...base, startDate: "2026-11-01T10:00", endDate: "2026-12-01T20:00" })).toBe(false);
    expect(hasPublishFormEnded({ ...base, startDate: "2026-11-19", isAllDay: true })).toBe(true);
    expect(hasPublishFormEnded({ ...base, startDate: "2026-11-20", isAllDay: true })).toBe(false);
    expect(hasPublishFormEnded(base)).toBe(false);
  });
});
