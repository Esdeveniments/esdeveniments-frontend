import { describe, it, expect } from "vitest";
import { computeTemporalStatus } from "@utils/event-status";

// Helper to build ISO dates relative to a fixed 'now'
const baseNow = new Date("2025-09-29T12:00:00.000Z");
const addHours = (h: number) => new Date(baseNow.getTime() + h * 3600 * 1000);
const addDays = (d: number) => addHours(d * 24);

describe("computeTemporalStatus", () => {
  it("returns upcoming with days granularity", () => {
    const start = addDays(3).toISOString();
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("upcoming");
    if (status.state === "upcoming") {
      expect(status.startsIn).toContain("3 dies");
    } else {
      throw new Error("Expected upcoming state");
    }
  });

  it("returns upcoming with hours granularity", () => {
    const start = addHours(5).toISOString();
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("upcoming");
    if (status.state === "upcoming") {
      expect(status.startsIn).toContain("5 hores");
    } else {
      throw new Error("Expected upcoming state");
    }
  });

  it("returns live with endsIn days when multi-day ongoing", () => {
    const start = addHours(-2).toISOString();
    const end = addDays(2).toISOString();
    const status = computeTemporalStatus(start, end, baseNow);
    expect(status.state).toBe("live");
    if (status.state === "live") {
      expect(status.endsIn).toContain("2 dies");
    } else {
      throw new Error("Expected live state");
    }
  });

  it("returns live with endsIn hours when ending soon", () => {
    const start = addHours(-1).toISOString();
    const end = addHours(4).toISOString();
    const status = computeTemporalStatus(start, end, baseNow);
    expect(status.state).toBe("live");
    if (status.state === "live") {
      expect(status.endsIn).toContain("4 hores");
    } else {
      throw new Error("Expected live state");
    }
  });

  it("returns past when end date passed", () => {
    const start = addDays(-3).toISOString();
    const end = addDays(-1).toISOString();
    const status = computeTemporalStatus(start, end, baseNow);
    expect(status.state).toBe("past");
    if (status.state === "past") {
      expect(status.endedOn).toBe(end.split("T")[0]);
    } else {
      throw new Error("Expected past state");
    }
  });

  it("returns past when no end date and started >24h ago", () => {
    const start = addDays(-3).toISOString();
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("past");
  });

  it("date-only start on same day (no times) is considered live", () => {
    // start as bare date (midnight UTC)
    const start = baseNow.toISOString().split("T")[0]; // '2025-09-29'
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("live");
  });

  it("date-only start more than 24h ago is past", () => {
    const start = addDays(-2).toISOString().split("T")[0]; // two days before
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("past");
  });

  it("datetime start with explicit time in future uses hour granularity", () => {
    const start = "2025-09-29T13:00:00.000Z"; // 1 hour from baseNow
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("upcoming");
    if (status.state === "upcoming") {
      expect(status.startsIn).toContain("1 hores");
    }
  });

  it("datetime start earlier today with explicit time is live", () => {
    const start = "2025-09-29T11:00:00.000Z"; // 1 hour before baseNow
    const status = computeTemporalStatus(start, undefined, baseNow);
    expect(status.state).toBe("live");
  });

  // Tests for "Consultar horaris" (all-day events with startTime = "00:00" or null)
  it("all-day event today with startTime=00:00 is live", () => {
    const start = "2025-09-29"; // same date as baseNow
    const status = computeTemporalStatus(start, undefined, baseNow, "00:00");
    expect(status.state).toBe("live");
    expect(status.label).toBe("En curs");
  });

  it("all-day event today with startTime=null is live", () => {
    const start = "2025-09-29"; // same date as baseNow
    const status = computeTemporalStatus(start, undefined, baseNow, null);
    expect(status.state).toBe("live");
    expect(status.label).toBe("En curs");
  });

  it("all-day event yesterday with startTime=00:00 is past", () => {
    const start = "2025-09-28"; // day before baseNow
    const status = computeTemporalStatus(start, undefined, baseNow, "00:00");
    expect(status.state).toBe("past");
  });

  it("all-day event tomorrow with startTime=00:00 is upcoming", () => {
    const start = "2025-09-30"; // day after baseNow
    const status = computeTemporalStatus(start, undefined, baseNow, "00:00");
    expect(status.state).toBe("upcoming");
    if (status.state === "upcoming") {
      expect(status.startsIn).toContain("1 dies");
    }
  });

  it("multi-day all-day event (startTime=00:00) spanning today is live", () => {
    const start = "2025-09-28"; // started yesterday
    const end = "2025-09-30"; // ends tomorrow
    const status = computeTemporalStatus(start, end, baseNow, "00:00");
    expect(status.state).toBe("live");
    if (status.state === "live" && status.endsIn) {
      expect(status.endsIn).toContain("1 dies");
    }
  });

  // Test for timed events with separate date and time strings (bug fix)
  it("timed event on same day with current time between startTime and endTime is live", () => {
    // Event: Nov 8, 2025, 10:00 - 14:00
    // Current time: Nov 8, 2025, 12:00 (between start and end, using local time)
    const eventDate = "2025-11-08";
    const startTime = "10:00";
    const endTime = "14:00";
    // Use local time construction to match how buildDateTime works
    const currentTime = new Date("2025-11-08T12:00");
    const status = computeTemporalStatus(
      eventDate,
      eventDate, // same day
      currentTime,
      startTime,
      endTime
    );
    expect(status.state).toBe("live");
    expect(status.label).toBe("En curs");
  });

  it("timed event on same day with current time before startTime is upcoming", () => {
    // Event: Nov 8, 2025, 10:00 - 14:00
    // Current time: Nov 8, 2025, 08:00 (before start, using local time to avoid timezone issues)
    const eventDate = "2025-11-08";
    const startTime = "10:00";
    const endTime = "14:00";
    // Use local time construction to match how buildDateTime works
    const currentTime = new Date("2025-11-08T08:00");
    const status = computeTemporalStatus(
      eventDate,
      eventDate,
      currentTime,
      startTime,
      endTime
    );
    expect(status.state).toBe("upcoming");
  });

  it("timed event on same day with current time after endTime is past", () => {
    // Event: Nov 8, 2025, 10:00 - 14:00
    // Current time: Nov 8, 2025, 15:00 (after end, using local time)
    const eventDate = "2025-11-08";
    const startTime = "10:00";
    const endTime = "14:00";
    // Use local time construction to match how buildDateTime works
    const currentTime = new Date("2025-11-08T15:00");
    const status = computeTemporalStatus(
      eventDate,
      eventDate,
      currentTime,
      startTime,
      endTime
    );
    expect(status.state).toBe("past");
  });
});
