import { describe, it, expect, beforeEach } from "vitest";
import { ensureGtag, sendGoogleEvent, CONSENT_MODE_DEFAULTS } from "@utils/analytics";
import type { WindowWithGtag } from "types/common";

function win(): WindowWithGtag {
  return window as unknown as WindowWithGtag;
}

describe("ensureGtag", () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  });

  it("initializes dataLayer and a queueing gtag shim", () => {
    ensureGtag();
    expect(Array.isArray(win().dataLayer)).toBe(true);
    expect(typeof win().gtag).toBe("function");
  });

  it("pushes the consent default as the first dataLayer entry", () => {
    ensureGtag();
    expect(Array.from(win().dataLayer[0] as ArrayLike<unknown>)).toEqual([
      "consent",
      "default",
      CONSENT_MODE_DEFAULTS,
    ]);
  });

  it("is idempotent: does not overwrite an existing gtag or re-push consent default", () => {
    const existingGtag = () => {};
    win().dataLayer = [];
    win().gtag = existingGtag;

    ensureGtag();

    expect(win().gtag).toBe(existingGtag);
    expect(win().dataLayer).toEqual([]);
  });

  it("never re-pushes the default once another caller already installed the shim", () => {
    // Simulates GoogleScripts' inline GTAG_SHIM script (or a real gtag.js
    // load) winning the race and installing the shim first: ensureGtag()
    // must not push a second 'default' command, which would reset an
    // already-granted consent state back to denied.
    win().dataLayer = [["consent", "default", CONSENT_MODE_DEFAULTS]];
    win().gtag = function gtag() {
      win().dataLayer.push(arguments);
    };

    ensureGtag();

    expect(win().dataLayer).toHaveLength(1);
  });
});

describe("sendGoogleEvent", () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  });

  it("no-ops when gtag was never installed", () => {
    expect(() => sendGoogleEvent("test_event", {})).not.toThrow();
  });

  it("forwards to gtag when it has been installed", () => {
    ensureGtag();
    sendGoogleEvent("test_event", { foo: "bar" });
    expect(Array.from(win().dataLayer.at(-1) as ArrayLike<unknown>)).toEqual([
      "event",
      "test_event",
      { foo: "bar" },
    ]);
  });
});
