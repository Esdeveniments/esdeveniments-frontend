import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import { eventDtoToFormData, formDataToBackendDTO } from "@utils/form-helpers";
import type { FormData } from "types/event";
import type { EventDetailResponseDTO } from "types/api/event";

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

describe("event edit form time", () => {
  const stored = {
    id: "5f1c0d2e-0000-4000-8000-000000000001",
    title: "Cercle",
    description: "Desc",
    startDate: "2026-12-05",
    startTime: "21:00:00",
    endDate: "2026-12-05",
    endTime: "23:30:00",
    region: { id: 1, name: "Barcelonès" },
    city: { id: 2, name: "Barcelona" },
    location: "Lloc",
    url: null,
    categories: [],
  } as unknown as EventDetailResponseDTO;

  it.each(["Europe/Madrid", "UTC", "America/New_York"])(
    "prefills the stored local time and saves it unchanged in %s",
    (tz) => {
      process.env.TZ = tz;
      const edit = eventDtoToFormData(stored);

      expect(edit.startDate).toBe("2026-12-05T21:00");
      expect(edit.endDate).toBe("2026-12-05T23:30");

      const dto = formDataToBackendDTO(edit);
      expect(dto.startDate).toBe("2026-12-05");
      expect(dto.startTime).toBe("21:00");
      expect(dto.endTime).toBe("23:30");
    },
  );

  it("saves a time changed in the date picker instead of the stored one", () => {
    const edit = eventDtoToFormData(stored);
    const changed = { ...edit, endDate: "2026-12-05T23:45" };

    expect(formDataToBackendDTO(changed).endTime).toBe("23:45");
    expect(mapDraftToPreviewEvent({ form: changed, imageUrl: null }).endTime).toBe("23:45");
  });
});
