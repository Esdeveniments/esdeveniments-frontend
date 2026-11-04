import { describe, expect, it, vi, afterEach } from "vitest";
import { getPublishDraftWarnings } from "@utils/publish-draft-warnings";
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
