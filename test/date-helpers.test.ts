import { describe, it, expect } from "vitest";
import { formatEventTimeDisplay } from "../utils/date-helpers";

describe("formatEventTimeDisplay", () => {
  describe("when no start time or start time is '00:00'", () => {
    it("returns 'Consultar horaris' when startTime is undefined", () => {
      expect(formatEventTimeDisplay(undefined, "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is null", () => {
      expect(formatEventTimeDisplay(null, "21:00")).toBe("Consultar horaris");
    });

    it("returns 'Consultar horaris' when startTime is '00:00'", () => {
      expect(formatEventTimeDisplay("00:00", "21:00")).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when startTime is '00:00' and endTime is undefined", () => {
      expect(formatEventTimeDisplay("00:00", undefined)).toBe(
        "Consultar horaris"
      );
    });

    it("returns 'Consultar horaris' when both times are undefined", () => {
      expect(formatEventTimeDisplay(undefined, undefined)).toBe(
        "Consultar horaris"
      );
    });
  });

  describe("when start time exists but no end time", () => {
    it("returns just the start time when endTime is undefined", () => {
      expect(formatEventTimeDisplay("19:00", undefined)).toBe("19:00");
    });

    it("returns just the start time when endTime is null", () => {
      expect(formatEventTimeDisplay("19:00", null)).toBe("19:00");
    });

    it("returns just the start time when endTime is empty string", () => {
      expect(formatEventTimeDisplay("19:00", "")).toBe("19:00");
    });
  });

  describe("when both start and end times exist", () => {
    it("returns just the start time when both times are identical", () => {
      expect(formatEventTimeDisplay("10:00", "10:00")).toBe("10:00");
    });

    it("returns time range in format 'HH:mm - HH:mm'", () => {
      expect(formatEventTimeDisplay("19:00", "21:00")).toBe("19:00 - 21:00");
    });

    it("handles morning times correctly", () => {
      expect(formatEventTimeDisplay("09:30", "12:00")).toBe("09:30 - 12:00");
    });

    it("handles afternoon times correctly", () => {
      expect(formatEventTimeDisplay("14:15", "17:45")).toBe("14:15 - 17:45");
    });

    it("handles evening times correctly", () => {
      expect(formatEventTimeDisplay("20:00", "23:30")).toBe("20:00 - 23:30");
    });

    it("handles midnight times correctly", () => {
      expect(formatEventTimeDisplay("23:00", "01:00")).toBe("23:00 - 01:00");
    });
  });

  describe("edge cases", () => {
    it("handles single digit hours correctly", () => {
      expect(formatEventTimeDisplay("09:00", "10:00")).toBe("09:00 - 10:00");
    });

    it("handles times with leading zeros correctly", () => {
      expect(formatEventTimeDisplay("08:05", "09:05")).toBe("08:05 - 09:05");
    });

    it("returns 'Consultar horaris' for empty string startTime", () => {
      expect(formatEventTimeDisplay("", "21:00")).toBe("Consultar horaris");
    });

    it("returns start time for empty string endTime when startTime is valid", () => {
      expect(formatEventTimeDisplay("19:00", "")).toBe("19:00");
    });
  });

  describe("when times include seconds", () => {
    it("strips seconds from start time", () => {
      expect(formatEventTimeDisplay("07:30:00", "09:00")).toBe("07:30 - 09:00");
    });

    it("strips seconds from end time", () => {
      expect(formatEventTimeDisplay("07:30", "09:00:00")).toBe("07:30 - 09:00");
    });

    it("strips seconds from both times", () => {
      expect(formatEventTimeDisplay("07:30:00", "09:00:00")).toBe(
        "07:30 - 09:00"
      );
    });

    it("handles start time with seconds and no end time", () => {
      expect(formatEventTimeDisplay("07:30:00", null)).toBe("07:30");
    });

    it("handles identical times with seconds as single time", () => {
      expect(formatEventTimeDisplay("07:30:00", "07:30:00")).toBe("07:30");
    });
  });
});

