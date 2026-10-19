import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import { formDataToBackendDTO } from "@utils/form-helpers";
import type { FormData } from "types/event";

// Pin a non-UTC zone so a UTC shift (toISOString) fails here even on CI.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Madrid";
});
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const form = (startDate: string, endDate: string) =>
  ({
    title: "Cercle",
    description: "Desc",
    type: "FREE",
    startDate,
    startTime: null,
    endDate,
    endTime: null,
    region: { value: "1", label: "Barcelona" },
    town: { value: "2", label: "Barcelona" },
    location: "Lloc",
    imageUrl: null,
    url: "",
    categories: [],
  }) as FormData;

describe("event form local time", () => {
  it("previews the time the user entered, not UTC", () => {
    const event = mapDraftToPreviewEvent({
      form: form("2026-10-30T11:30", "2026-10-30T14:30"),
      imageUrl: null,
    });

    expect(event.startTime).toBe("11:30");
    expect(event.endTime).toBe("14:30");
  });

  it("publishes the same date and time the preview shows", () => {
    const dto = formDataToBackendDTO(form("2026-10-31T00:30", "2026-10-31T02:00"));

    expect(dto.startDate).toBe("2026-10-31");
    expect(dto.startTime).toBe("00:30");
    expect(dto.endTime).toBe("02:00");
  });

  it("rejects an invalid date instead of sending NaN", () => {
    expect(() => formDataToBackendDTO(form("", ""))).toThrow(RangeError);
  });

  it("keeps date-only edit values on their day west of UTC", () => {
    process.env.TZ = "America/New_York";
    try {
      const dto = formDataToBackendDTO(form("2026-10-30", "2026-10-30"));
      expect(dto.startDate).toBe("2026-10-30");
    } finally {
      process.env.TZ = "Europe/Madrid";
    }
  });
});
