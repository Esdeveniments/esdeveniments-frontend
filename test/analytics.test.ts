import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ensureGtag,
  sendGoogleEvent,
  setAnalyticsUserId,
  CONSENT_MODE_DEFAULTS,
  markTextSearchSubmitted,
  sendTextSearchOutcomeGA,
  markSuggestionsShown,
  flushAbandonedSearch,
  sendSearchOutcomeGA,
} from "@utils/analytics";
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

  it("queues the event when gtag was never installed", () => {
    sendGoogleEvent("test_event", { foo: "bar" });
    expect(Array.from(win().dataLayer.at(-1) as ArrayLike<unknown>)).toEqual([
      "event",
      "test_event",
      { foo: "bar" },
    ]);
  });

  it("does not push GA config off the production host", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS", "G-TEST");
    try {
      sendGoogleEvent("test_event", {});
      const commands = win().dataLayer.map((c) => (c as ArrayLike<unknown>)[0]);
      expect(commands).not.toContain("config");
    } finally {
      vi.unstubAllEnvs();
    }
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

describe("setAnalyticsUserId", () => {
  const userIdCommands = () =>
    win()
      .dataLayer.map((c) => Array.from(c as ArrayLike<unknown>))
      .filter((args) => args[0] === "set");

  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    localStorage.clear();
  });

  it("sends nothing for a visitor who never signed in", () => {
    setAnalyticsUserId(null);
    expect(userIdCommands()).toEqual([]);
  });

  it("sets the user_id, then clears it once on sign-out", () => {
    setAnalyticsUserId("user-123");
    setAnalyticsUserId(null);
    setAnalyticsUserId(null);
    expect(userIdCommands()).toEqual([
      ["set", { user_id: "user-123" }],
      ["set", { user_id: null }],
    ]);
  });
});

describe("text search outcome", () => {
  let gtag: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  const outcomes = () =>
    gtag.mock.calls.filter((call) => call[1] === "search_outcome").map((call) => call[2]);

  beforeEach(() => {
    gtag = vi.fn<(...args: unknown[]) => void>();
    win().dataLayer = [];
    win().gtag = gtag;
  });

  it("reports a submitted search once, when its listing loads", () => {
    markTextSearchSubmitted("hero_search", "  Castell ");
    sendTextSearchOutcomeGA("castell", 4);
    sendTextSearchOutcomeGA("castell", 4);
    expect(outcomes()).toEqual([{ context: "hero_search", outcome: "events_results" }]);
  });

  it("reports zero results, and ignores listings for other searches", () => {
    markTextSearchSubmitted("search", "xyz");
    sendTextSearchOutcomeGA("other", 0);
    sendTextSearchOutcomeGA("xyz", 0);
    expect(outcomes()).toEqual([{ context: "search", outcome: "events_zero" }]);
  });

  it("reports abandoned once when the user leaves after a shown list", () => {
    markSuggestionsShown("hero_search");
    flushAbandonedSearch();
    flushAbandonedSearch();
    expect(outcomes()).toEqual([{ context: "hero_search", outcome: "abandoned" }]);
  });

  it("doesn't report abandoned after a submit from anywhere, or another outcome", () => {
    markSuggestionsShown("hero_search");
    // The hero CTA submits outside the search box, even with the list closed.
    markTextSearchSubmitted("hero_cta", "castell");
    flushAbandonedSearch();
    markSuggestionsShown("search");
    sendSearchOutcomeGA("search", "place");
    flushAbandonedSearch();
    expect(outcomes()).toEqual([{ context: "search", outcome: "place" }]);
  });
});
