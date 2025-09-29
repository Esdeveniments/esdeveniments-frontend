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
});
