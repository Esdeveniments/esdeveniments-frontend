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

  it("keeps the per-error cap after errors rejected by the total cap", () => {
    helpers.throttleEvent(errorEvent("first"), 0);
    for (let i = 0; i < 499; i++) helpers.throttleEvent(errorEvent(`burst ${i}`), 1);
    helpers.throttleEvent(errorEvent("next window"), 600_000);
    const sent = Array.from({ length: 10 }, () =>
      helpers.throttleEvent(errorEvent("repeated"), 600_000),
    );
    expect(sent.filter(Boolean)).toHaveLength(5);
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

  it("never starves immediate publish alerts under the global cap, while still enforcing the per-error cap", () => {
    for (let i = 0; i < 25; i++) {
      helpers.throttleEvent(errorEvent(`Unrelated error ${i}`), 0);
    }
    const publishEvents = Array.from({ length: 7 }, () =>
      helpers.throttleEvent(
        {
          ...errorEvent("createEvent: HTTP 500"),
          tags: { publish_alert: "immediate" },
        },
        0,
      ),
    );
    expect(publishEvents.filter(Boolean)).toHaveLength(5);
  });

  it("caps untracked immediate publish alerts even when the per-error map is full", () => {
    for (let i = 0; i < 500; i++) {
      helpers.throttleEvent(
        {
          ...errorEvent(`createEvent: unique error ${i}`),
          tags: { publish_alert: "immediate" },
        },
        0,
      );
    }

    const overflow = Array.from({ length: 8 }, (_, i) =>
      helpers.throttleEvent(
        {
          ...errorEvent(`createEvent: overflow error ${i}`),
          tags: { publish_alert: "immediate" },
        },
        1,
      ),
    );
    expect(overflow.filter(Boolean)).toHaveLength(5);
  });

  it("preserves immediate publish alerts matching generic non-json or network noise filters", () => {
    const hint = { originalException: "string-error" };
    const wafEvent: Event = {
      ...errorEvent("Unexpected non-JSON response from /publica"),
      tags: { publish_alert: "immediate" },
    };
    const networkEvent: Event = {
      ...errorEvent("NetworkError when attempting to fetch resource. Failed to fetch"),
      tags: { publish_alert: "immediate" },
    };

    expect(helpers.beforeSend(wafEvent, hint)).not.toBeNull();
    expect(helpers.beforeSend(networkEvent, hint)).not.toBeNull();
    expect(
      helpers.beforeSend(errorEvent("Unexpected non-JSON response"), hint),
    ).toBeNull();
  });
});

describe("sentryEnvironment", () => {
  it("labels each deploy by its site URL", () => {
    expect(helpers.sentryEnvironment("https://www.esdeveniments.cat")).toBe("production");
    expect(helpers.sentryEnvironment("https://staging.esdeveniments.cat")).toBe("staging");
    expect(helpers.sentryEnvironment("http://localhost:3000")).toBe("preview");
    expect(helpers.sentryEnvironment("https://staging.example.net")).toBe("preview");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(helpers.sentryEnvironment()).toBe("preview");
    vi.unstubAllEnvs();
  });
});
