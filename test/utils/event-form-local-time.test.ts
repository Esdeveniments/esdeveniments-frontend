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

  it.each(["2026-10-30T25:99", "2026-13-01T10:00", "2026-10-32T10:00", "2026-02-29T10:00", "2026-04-31"])(
    "rejects an out-of-range date or time: %s",
    (value) => {
      expect(() => formDataToBackendDTO(form(value, value))).toThrow(RangeError);
    },
  );

  it("accepts a leap day", () => {
    expect(formDataToBackendDTO(form("2028-02-29T10:00", "2028-02-29T11:00")).startDate).toBe("2028-02-29");
  });

  it("accepts the edges of the clock", () => {
    const dto = formDataToBackendDTO(form("2026-12-31T00:00", "2026-12-31T23:59"));
    expect([dto.startTime, dto.endTime]).toEqual(["00:00", "23:59"]);
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

  it.each(["Europe/Madrid", "UTC", "America/New_York"])(
    "opens an event with no stored times as all-day and saves 00:00 to 23:59 in %s",
    (tz) => {
      process.env.TZ = tz;
      const edit = eventDtoToFormData({ ...stored, startTime: null, endTime: null });

      expect(edit).toMatchObject({
        isAllDay: true,
        startDate: "2026-12-05T00:00",
        endDate: "2026-12-05T23:59",
      });
      const dto = formDataToBackendDTO(edit);
      expect([dto.startDate, dto.startTime, dto.endDate, dto.endTime])
        .toEqual(["2026-12-05", "00:00", "2026-12-05", "23:59"]);
    },
  );

  it.each(["Europe/Madrid", "UTC", "America/New_York"])(
    "keeps a timed event with no stored end listed to the end of its day in %s",
    (tz) => {
      process.env.TZ = tz;
      const edit = eventDtoToFormData({ ...stored, endTime: null });

      expect(edit).toMatchObject({ isAllDay: false, startDate: "2026-12-05T21:00" });
      const dto = formDataToBackendDTO(edit);
      expect([dto.startTime, dto.endDate, dto.endTime]).toEqual(["21:00", "2026-12-05", "23:59"]);
    },
  );

  it("reopens a saved all-day event as all-day", () => {
    const saved = formDataToBackendDTO(eventDtoToFormData({ ...stored, startTime: null, endTime: null }));
    const reopened = eventDtoToFormData({ ...stored, startTime: `${saved.startTime}:00`, endTime: `${saved.endTime}:00` });

    expect(reopened.isAllDay).toBe(true);
  });

  it("keeps a stored midnight start with an end time timed and unchanged", () => {
    const edit = eventDtoToFormData({ ...stored, startTime: "00:00:00", endTime: "03:00:00" });

    expect(edit.isAllDay).toBe(false);
    expect(formDataToBackendDTO(edit).endTime).toBe("03:00");
  });

  it("saves a time changed in the date picker instead of the stored one", () => {
    const edit = eventDtoToFormData(stored);
    const changed = { ...edit, endDate: "2026-12-05T23:45" };

    expect(formDataToBackendDTO(changed).endTime).toBe("23:45");
    expect(mapDraftToPreviewEvent({ form: changed, imageUrl: null }).endTime).toBe("23:45");
  });
});

describe("event form DST gap", () => {
  it.each([
    ["Europe/Madrid", "2027-03-28T02:30", "2027-03-28T04:00"],
    ["America/New_York", "2027-03-14T02:30", "2027-03-14T04:00"],
  ])("sends a nonexistent local time unchanged in %s", (tz, start, end) => {
    process.env.TZ = tz;
    const dto = formDataToBackendDTO(form(start, end));

    expect(dto.startDate).toBe(start.slice(0, 10));
    expect(dto.startTime).toBe("02:30");
    expect(dto.endTime).toBe("04:00");
  });

  it("round-trips a stored DST-gap time through the edit form", () => {
    process.env.TZ = "Europe/Madrid";
    const edit = eventDtoToFormData({
      id: "5f1c0d2e-0000-4000-8000-000000000001",
      title: "Cercle",
      description: "Desc",
      startDate: "2027-03-28",
      startTime: "02:30:00",
      endDate: "2027-03-28",
      endTime: "04:00:00",
      region: { id: 1, name: "Barcelonès" },
      city: { id: 2, name: "Barcelona" },
      location: "Lloc",
      url: null,
      categories: [],
    } as unknown as EventDetailResponseDTO);

    expect(formDataToBackendDTO(edit).startTime).toBe("02:30");
  });
});
