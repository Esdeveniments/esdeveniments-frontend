import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_OUTAGE_WINDOW_MS,
  isEventReadFailing,
  markEventReadFailed,
} from "@lib/api/event-outage";

describe("event read outage window", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports failing reads for a minute after the last failure", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    markEventReadFailed();
    expect(isEventReadFailing()).toBe(true);

    now.mockReturnValue(1_000 + EVENT_OUTAGE_WINDOW_MS - 1);
    expect(isEventReadFailing()).toBe(true);

    now.mockReturnValue(1_000 + EVENT_OUTAGE_WINDOW_MS);
    expect(isEventReadFailing()).toBe(false);
  });
});
