import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_OUTAGE_WINDOW_MS,
  isEventReadFailing,
  markEventReadFailed,
} from "@lib/api/event-outage";

describe("event read outage breaker", () => {
  let now: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, Symbol.for("esdeveniments.eventReadFailures"));
    now = vi.spyOn(performance, "now").mockReturnValue(1_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens only once three different events fail", () => {
    markEventReadFailed("a");
    markEventReadFailed("b");
    expect(isEventReadFailing()).toBe(false);

    markEventReadFailed("c");
    expect(isEventReadFailing()).toBe(true);
  });

  it("ignores one event failing again and again", () => {
    for (let i = 0; i < 10; i++) markEventReadFailed("broken");

    expect(isEventReadFailing()).toBe(false);
  });

  it("closes a minute after the failures", () => {
    ["a", "b", "c"].forEach(markEventReadFailed);

    now.mockReturnValue(1_000 + EVENT_OUTAGE_WINDOW_MS - 1);
    expect(isEventReadFailing()).toBe(true);

    now.mockReturnValue(1_000 + EVENT_OUTAGE_WINDOW_MS);
    expect(isEventReadFailing()).toBe(false);
  });

  it("doesn't count failures older than the window", () => {
    markEventReadFailed("a");
    markEventReadFailed("b");
    now.mockReturnValue(1_000 + EVENT_OUTAGE_WINDOW_MS);
    markEventReadFailed("c");

    expect(isEventReadFailing()).toBe(false);
  });
});
