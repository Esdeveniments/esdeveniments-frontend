import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@sentry/nextjs";

const errorEvent = (value: string): Event => ({
  exception: { values: [{ type: "Error", value }] },
});

let helpers: typeof import("@utils/sentry-helpers");

beforeEach(async () => {
  vi.resetModules();
  helpers = await import("@utils/sentry-helpers");
});

describe("throttleEvent", () => {
  it("keeps 5 of the same error per 10 minutes, then reports the dropped count", () => {
    const sent = Array.from({ length: 8 }, () =>
      helpers.throttleEvent(errorEvent("HTTP error! status: 504"), 0),
    );
    expect(sent.filter(Boolean)).toHaveLength(5);

    expect(helpers.throttleEvent(errorEvent("HTTP error! status: 504"), 599_999)).toBeNull();
    const next = helpers.throttleEvent(errorEvent("HTTP error! status: 504"), 600_000);
    expect(next?.extra).toEqual({ droppedSimilarEvents: 4 });
    expect(
      helpers.throttleEvent(errorEvent("HTTP error! status: 504"), 600_001)?.extra,
    ).toBeUndefined();
  });

  it("caps all errors at 20 per window, even when each message differs", () => {
    const sent = Array.from({ length: 30 }, (_, i) =>
      helpers.throttleEvent(errorEvent(`Failed to fetch place town-${i}: HTTP 503`), 0),
    );
    expect(sent.filter(Boolean)).toHaveLength(20);
  });

  it("keeps the total cap when more distinct errors arrive than it tracks", () => {
    const sent = Array.from({ length: 5_000 }, (_, i) =>
      helpers.throttleEvent(errorEvent(`Failed to fetch place town-${i}: HTTP 503`), 0),
    );
    expect(sent.filter(Boolean)).toHaveLength(20);
    expect(
      helpers.throttleEvent(errorEvent("Failed to fetch place town-0: HTTP 503"), 600_000),
    ).not.toBeNull();
  });

  it("runs last in beforeSend, so filtered events don't use the cap", () => {
    const hint = { originalException: new Error("x") };
    for (let i = 0; i < 25; i++) {
      helpers.beforeSend(
        errorEvent(`NetworkError when attempting to fetch resource ${i}. Failed to fetch`),
        hint,
      );
    }
    expect(helpers.beforeSend(errorEvent("TypeError: real bug"), hint)).not.toBeNull();
  });
});

describe("sentryEnvironment", () => {
  it("labels each deploy by its site URL", () => {
    expect(helpers.sentryEnvironment("https://www.esdeveniments.cat")).toBe("production");
    expect(helpers.sentryEnvironment("https://staging.esdeveniments.cat")).toBe("staging");
    expect(helpers.sentryEnvironment("http://localhost:3000")).toBe("preview");
    expect(helpers.sentryEnvironment(undefined)).toBe("preview");
  });
});
