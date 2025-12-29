import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeNavigationFeedback,
  resetNavigationFeedback,
  startNavigationFeedback,
  subscribeNavigationFeedback,
} from "@lib/navigation-feedback";

describe("navigation-feedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetNavigationFeedback();
  });

  afterEach(() => {
    resetNavigationFeedback();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("emits start once even if called multiple times", () => {
    const events: string[] = [];
    const unsubscribe = subscribeNavigationFeedback((event) => events.push(event));

    startNavigationFeedback();
    startNavigationFeedback();
    startNavigationFeedback();

    expect(events).toEqual(["start"]);

    unsubscribe();
  });

  it("emits complete once and ignores extra completes", () => {
    const events: string[] = [];
    const unsubscribe = subscribeNavigationFeedback((event) => events.push(event));

    startNavigationFeedback();
    completeNavigationFeedback();
    completeNavigationFeedback();

    expect(events).toEqual(["start", "complete"]);

    unsubscribe();
  });

  it("does not get stuck when start is triggered multiple times before completion", () => {
    const events: string[] = [];
    const unsubscribe = subscribeNavigationFeedback((event) => events.push(event));

    startNavigationFeedback();
    startNavigationFeedback();

    completeNavigationFeedback();

    // If we were still pending, this start would be ignored.
    startNavigationFeedback();

    expect(events).toEqual(["start", "complete", "start"]);

    unsubscribe();
  });

  it("auto-resets if navigation never completes (failsafe)", () => {
    const events: string[] = [];
    const unsubscribe = subscribeNavigationFeedback((event) => events.push(event));

    startNavigationFeedback();

    // Advance past the failsafe timeout (value is internal; overshoot safely).
    vi.advanceTimersByTime(25_000);

    // After auto-reset, a new start should be allowed.
    startNavigationFeedback();

    expect(events).toEqual(["start", "complete", "start"]);

    unsubscribe();
  });
});
