import { describe, it, expect } from "vitest";
import {
  formatEventTimeDisplay as baseFormatEventTimeDisplay,
  formatEventTimeDisplayDetail as baseFormatEventTimeDisplayDetail,
  getFormattedDate,
  type EventTimeLabels,
} from "../utils/date-helpers";

const labels: EventTimeLabels = {
  consult: "Consultar horaris",
  startsAt: "Comença a les {time}",
  range: "De {start} a {end}",
  simpleRange: "{start} - {end}",
};

const formatEventTimeDisplay = (
  start?: string | null,
  end?: string | null
): string => baseFormatEventTimeDisplay(start, end, labels);

const formatEventTimeDisplayDetail = (
  start?: string | null,
  end?: string | null
): string => baseFormatEventTimeDisplayDetail(start, end, labels);

// convenience aliases used in a few tests below
const formatDisplay = formatEventTimeDisplay;
const formatDetail = formatEventTimeDisplayDetail;

describe("formatEventTimeDisplay", () => {
  describe("when no start time or start time is '00:00'", () => {
    it("returns 'Consultar horaris' when startTime is undefined", () => {
      expect(formatDisplay(undefined, "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is null", () => {
      expect(formatDisplay(null, "21:00")).toBe("Consultar horaris");
    });

    it("returns 'Consultar horaris' when startTime is '00:00'", () => {
      expect(formatDisplay("00:00", "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is '00:00' and endTime is undefined", () => {
      expect(formatDisplay("00:00", undefined)).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when both times are undefined", () => {
      expect(formatDisplay(undefined, undefined)).toBe(
        "Consultar horaris"
      );
    });
  });

  describe("when start time exists but no end time", () => {
    it("returns just the start time when endTime is undefined", () => {
      expect(formatDisplay("19:00", undefined)).toBe("19:00");
    });

    it("returns just the start time when endTime is null", () => {
      expect(formatDisplay("19:00", null)).toBe("19:00");
    });

    it("returns just the start time when endTime is empty string", () => {
      expect(formatDisplay("19:00", "")).toBe("19:00");
    });
  });

  describe("when both start and end times exist", () => {
    it("returns just the start time when both times are identical", () => {
      expect(formatDisplay("10:00", "10:00")).toBe("10:00");
    });

    it("returns time range in format 'HH:mm - HH:mm'", () => {
      expect(formatDisplay("19:00", "21:00")).toBe("19:00 - 21:00");
    });

    it("handles morning times correctly", () => {
      expect(formatDisplay("09:30", "12:00")).toBe("09:30 - 12:00");
    });

    it("handles afternoon times correctly", () => {
      expect(formatDisplay("14:15", "17:45")).toBe("14:15 - 17:45");
    });

    it("handles evening times correctly", () => {
      expect(formatDisplay("20:00", "23:30")).toBe("20:00 - 23:30");
    });

    it("handles midnight times correctly", () => {
      expect(formatDisplay("23:00", "01:00")).toBe("23:00 - 01:00");
    });
  });

  describe("edge cases", () => {
    it("handles single digit hours correctly", () => {
      expect(formatDisplay("09:00", "10:00")).toBe("09:00 - 10:00");
    });

    it("handles times with leading zeros correctly", () => {
      expect(formatDisplay("08:05", "09:05")).toBe("08:05 - 09:05");
    });

    it("returns 'Consultar horaris' for empty string startTime", () => {
      expect(formatDisplay("", "21:00")).toBe("Consultar horaris");
    });

    it("returns start time for empty string endTime when startTime is valid", () => {
      expect(formatDisplay("19:00", "")).toBe("19:00");
    });
  });

  describe("when times include seconds", () => {
    it("strips seconds from start time", () => {
      expect(formatDisplay("07:30:00", "09:00")).toBe("07:30 - 09:00");
    });

    it("strips seconds from end time", () => {
      expect(formatDisplay("07:30", "09:00:00")).toBe("07:30 - 09:00");
    });

    it("strips seconds from both times", () => {
      expect(formatDisplay("07:30:00", "09:00:00")).toBe(
        "07:30 - 09:00"
      );
    });

    it("handles start time with seconds and no end time", () => {
      expect(formatDisplay("07:30:00", null)).toBe("07:30");
    });

    it("handles identical times with seconds as single time", () => {
      expect(formatDisplay("07:30:00", "07:30:00")).toBe("07:30");
    });
  });
});

describe("formatEventTimeDisplayDetail", () => {
  describe("when no start time or start time is '00:00'", () => {
    it("returns 'Consultar horaris' when startTime is undefined", () => {
      expect(formatDetail(undefined, "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is null", () => {
      expect(formatDetail(null, "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is '00:00'", () => {
      expect(formatDetail("00:00", "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is '00:00' and endTime is undefined", () => {
      expect(formatDetail("00:00", undefined)).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when both times are undefined", () => {
      expect(formatDetail(undefined, undefined)).toBe(
        "Consultar horaris"
      );
    });
  });

  describe("when start time exists but no end time", () => {
    it("returns 'Comença a les HH:mm' when endTime is undefined", () => {
      expect(formatDetail("19:00", undefined)).toBe(
        "Comença a les 19:00"
      );
    });

    it("returns 'Comença a les HH:mm' when endTime is null", () => {
      expect(formatDetail("19:00", null)).toBe(
        "Comença a les 19:00"
      );
    });

    it("returns 'Comença a les HH:mm' when endTime is empty string", () => {
      expect(formatDetail("19:00", "")).toBe(
        "Comença a les 19:00"
      );
    });

    it("handles single digit hours correctly", () => {
      expect(formatDetail("09:00", null)).toBe(
        "Comença a les 09:00"
      );
    });

    it("handles times with minutes correctly", () => {
      expect(formatDetail("10:30", null)).toBe(
        "Comença a les 10:30"
      );
    });
  });

  describe("when both start and end times exist", () => {
    it("returns 'De HH:mm a HH:mm' format", () => {
      expect(formatDetail("19:00", "21:00")).toBe(
        "De 19:00 a 21:00"
      );
    });

    it("handles morning times correctly", () => {
      expect(formatDetail("09:30", "12:00")).toBe(
        "De 09:30 a 12:00"
      );
    });

    it("handles afternoon times correctly", () => {
      expect(formatDetail("14:15", "17:45")).toBe(
        "De 14:15 a 17:45"
      );
    });

    it("handles evening times correctly", () => {
      expect(formatDetail("20:00", "23:30")).toBe(
        "De 20:00 a 23:30"
      );
    });

    it("handles midnight times correctly", () => {
      expect(formatDetail("23:00", "01:00")).toBe(
        "De 23:00 a 01:00"
      );
    });

    it("handles single digit hours correctly", () => {
      expect(formatDetail("09:00", "10:00")).toBe(
        "De 09:00 a 10:00"
      );
    });

    it("handles times with leading zeros correctly", () => {
      expect(formatDetail("08:05", "09:05")).toBe(
        "De 08:05 a 09:05"
      );
    });
  });

  describe("edge cases", () => {
    it("returns 'Consultar horaris' for empty string startTime", () => {
      expect(formatEventTimeDisplayDetail("", "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Comença a les HH:mm' for empty string endTime when startTime is valid", () => {
      expect(formatEventTimeDisplayDetail("19:00", "")).toBe(
        "Comença a les 19:00"
      );
    });
  });

  describe("when times include seconds", () => {
    it("strips seconds from start time", () => {
      expect(formatEventTimeDisplayDetail("07:30:00", "09:00")).toBe(
        "De 07:30 a 09:00"
      );
    });

    it("strips seconds from end time", () => {
      expect(formatEventTimeDisplayDetail("07:30", "09:00:00")).toBe(
        "De 07:30 a 09:00"
      );
    });

    it("strips seconds from both times", () => {
      expect(formatEventTimeDisplayDetail("07:30:00", "09:00:00")).toBe(
        "De 07:30 a 09:00"
      );
    });

    it("handles start time with seconds and no end time", () => {
      expect(formatEventTimeDisplayDetail("07:30:00", null)).toBe(
        "Comença a les 07:30"
      );
    });

    it("handles identical times with seconds as single time (no end time)", () => {
      expect(formatEventTimeDisplayDetail("07:30:00", "07:30:00")).toBe(
        "Comença a les 07:30"
      );
    });
  });

  describe("additional edge cases and validation", () => {
    it("handles times at midnight (00:00) correctly as all-day event", () => {
      expect(formatEventTimeDisplayDetail("00:00", "00:00")).toBe(
        "Consultar horaris"
      );
    });

    it("handles times at midnight start with valid end time", () => {
      expect(formatEventTimeDisplayDetail("00:00", "23:59")).toBe(
        "Consultar horaris"
      );
    });

    it("handles very early morning times", () => {
      expect(formatEventTimeDisplayDetail("00:30", null)).toBe(
        "Comença a les 00:30"
      );
    });

    it("handles very early morning time ranges", () => {
      expect(formatEventTimeDisplayDetail("00:30", "01:00")).toBe(
        "De 00:30 a 01:00"
      );
    });

    it("handles times that cross midnight", () => {
      expect(formatEventTimeDisplayDetail("23:30", "01:00")).toBe(
        "De 23:30 a 01:00"
      );
    });

    it("handles times very close together (1 minute difference)", () => {
      expect(formatEventTimeDisplayDetail("19:00", "19:01")).toBe(
        "De 19:00 a 19:01"
      );
    });

    it("handles times with same hour but different minutes", () => {
      expect(formatEventTimeDisplayDetail("19:00", "19:59")).toBe(
        "De 19:00 a 19:59"
      );
    });

    it("handles noon times correctly", () => {
      expect(formatEventTimeDisplayDetail("12:00", null)).toBe(
        "Comença a les 12:00"
      );
    });

    it("handles noon to afternoon range", () => {
      expect(formatEventTimeDisplayDetail("12:00", "14:00")).toBe(
        "De 12:00 a 14:00"
      );
    });

    it("handles times with single digit minutes", () => {
      expect(formatEventTimeDisplayDetail("09:05", "10:05")).toBe(
        "De 09:05 a 10:05"
      );
    });

    it("handles times with zero minutes", () => {
      expect(formatEventTimeDisplayDetail("09:00", "10:00")).toBe(
        "De 09:00 a 10:00"
      );
    });

    it("handles times with 59 minutes", () => {
      expect(formatEventTimeDisplayDetail("09:59", "10:59")).toBe(
        "De 09:59 a 10:59"
      );
    });

    it("handles late night times", () => {
      expect(formatEventTimeDisplayDetail("22:45", null)).toBe(
        "Comença a les 22:45"
      );
    });

    it("handles late night to early morning range", () => {
      expect(formatEventTimeDisplayDetail("22:00", "02:00")).toBe(
        "De 22:00 a 02:00"
      );
    });

    it("handles times with various minute values", () => {
      expect(formatEventTimeDisplayDetail("15:15", "16:45")).toBe(
        "De 15:15 a 16:45"
      );
    });

    it("handles times with 30 minutes (half hour)", () => {
      expect(formatEventTimeDisplayDetail("10:30", "11:30")).toBe(
        "De 10:30 a 11:30"
      );
    });

    it("handles times with 45 minutes (three quarters)", () => {
      expect(formatEventTimeDisplayDetail("14:45", "16:15")).toBe(
        "De 14:45 a 16:15"
      );
    });

    it("handles identical start and end times (normalized)", () => {
      expect(formatEventTimeDisplayDetail("19:00", "19:00")).toBe(
        "Comença a les 19:00"
      );
    });

    it("handles times with extra colons (invalid format that gets cleaned)", () => {
      expect(formatEventTimeDisplayDetail("19:00:00", "21:00:00")).toBe(
        "De 19:00 a 21:00"
      );
    });

    it("handles times without leading zeros in input (preserves format)", () => {
      // formatTimeForAPI preserves the input format, so single digit hours stay as-is
      expect(formatEventTimeDisplayDetail("9:00", "10:00")).toBe(
        "De 9:00 a 10:00"
      );
    });

    it("handles times with single digit hours and minutes (preserves format)", () => {
      // formatTimeForAPI preserves the input format
      expect(formatEventTimeDisplayDetail("9:5", "10:5")).toBe("De 9:5 a 10:5");
    });

    it("handles very short time ranges (same hour)", () => {
      expect(formatEventTimeDisplayDetail("19:00", "19:30")).toBe(
        "De 19:00 a 19:30"
      );
    });

    it("handles long time ranges (multiple hours)", () => {
      expect(formatEventTimeDisplayDetail("09:00", "17:00")).toBe(
        "De 09:00 a 17:00"
      );
    });

    it("handles times at exact hour boundaries", () => {
      expect(formatEventTimeDisplayDetail("08:00", "09:00")).toBe(
        "De 08:00 a 09:00"
      );
    });

    it("handles times with all zeros except start hour", () => {
      expect(formatEventTimeDisplayDetail("01:00", null)).toBe(
        "Comença a les 01:00"
      );
    });

    it("handles times with all zeros except end hour", () => {
      expect(formatEventTimeDisplayDetail("01:00", "02:00")).toBe(
        "De 01:00 a 02:00"
      );
    });

    it("handles times with maximum valid hour (23)", () => {
      expect(formatEventTimeDisplayDetail("23:00", null)).toBe(
        "Comença a les 23:00"
      );
    });

    it("handles times with maximum valid hour and minutes (23:59)", () => {
      expect(formatEventTimeDisplayDetail("23:59", null)).toBe(
        "Comença a les 23:59"
      );
    });

    it("handles range from maximum hour to next day", () => {
      expect(formatEventTimeDisplayDetail("23:30", "00:30")).toBe(
        "De 23:30 a 00:30"
      );
    });
  });
});

describe("getFormattedDate", () => {
  it("formats same-month multi-day ranges in English without day-only start", () => {
    const result = getFormattedDate(
      "2025-12-19T12:00:00.000Z",
      "2025-12-31T12:00:00.000Z",
      "en"
    );

    expect(result.isMultipleDays).toBe(true);
    expect(result.formattedStart).toBe("December 19");
    expect(result.formattedEnd).toBe("31, 2025");
  });

  it("keeps day-only start for same-month multi-day ranges in Catalan", () => {
    const result = getFormattedDate(
      "2025-12-19T12:00:00.000Z",
      "2025-12-31T12:00:00.000Z",
      "ca"
    );

    expect(result.isMultipleDays).toBe(true);
    expect(result.formattedStart).toBe("19");
    expect(result.formattedEnd).toBe("31 de desembre del 2025");
  });

  it("keeps day-only start for same-month multi-day ranges in Spanish", () => {
    const result = getFormattedDate(
      "2025-12-19T12:00:00.000Z",
      "2025-12-31T12:00:00.000Z",
      "es"
    );

    expect(result.isMultipleDays).toBe(true);
    expect(result.formattedStart).toBe("19");
    expect(result.formattedEnd).toBe("31 de diciembre de 2025");
  });

  it("includes year for single-day dates in English", () => {
    const result = getFormattedDate("2025-12-19T12:00:00.000Z", undefined, "en");

    expect(result.isMultipleDays).toBe(false);
    expect(result.formattedStart).toBe("December 19, 2025");
    expect(result.formattedEnd).toBe(null);
  });
});
