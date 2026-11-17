import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  captureException,
  captureMessage,
  cacheLife,
  fetchAllEventPagesExternal,
  summarizeTowns,
} = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  cacheLife: vi.fn(),
  fetchAllEventPagesExternal: vi.fn(),
  summarizeTowns: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException, captureMessage }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag: vi.fn() }));
vi.mock("@lib/api/events-external", () => ({ fetchAllEventPagesExternal }));
vi.mock("@utils/festa-major-calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/festa-major-calendar")>();
  summarizeTowns.mockImplementation(actual.summarizeTowns);
  return { ...actual, summarizeTowns };
});

import { reportCachedReadFailure } from "@lib/api/report-cached-read";
import { fetchFestaMajorCalendar, fetchFestaMajorPlace } from "@lib/api/festes-majors";
import { fetchFestivityPage } from "@lib/api/festivities";

const backendFailure = new Error("fetchAllEventPagesExternal: HTTP 503");

describe("reportCachedReadFailure", () => {
  beforeEach(() => captureException.mockReset());

  it("returns the value and reports nothing", async () => {
    await expect(reportCachedReadFailure(async () => 42, {})).resolves.toBe(42);

    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports the original error with its context and rethrows that same error", async () => {
    const context = { tags: { section: "test" } };

    await expect(
      reportCachedReadFailure(async () => {
        throw backendFailure;
      }, context),
    ).rejects.toBe(backendFailure);

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(backendFailure, context);
  });
});

// "use cache" functions hand their callers an error without its message, so
// the read reports it itself, once per failed read, and the caller only falls
// back.
describe("reads inside use cache report their own failure", () => {
  beforeEach(() => {
    captureException.mockReset();
    cacheLife.mockReset();
    fetchAllEventPagesExternal.mockReset();
    fetchAllEventPagesExternal.mockRejectedValue(backendFailure);
  });

  it("festa major place: this year and last year each report", async () => {
    await expect(fetchFestaMajorPlace("cardedeu")).resolves.toBeNull();

    expect(captureException).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(backendFailure, {
      tags: { section: "festes-majors" },
      extra: { place: "cardedeu", year: expect.any(Number) },
    });
  });

  it("festa major calendar: both years are one read, so one report", async () => {
    await expect(fetchFestaMajorCalendar()).resolves.toBeNull();

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(backendFailure, {
      tags: { section: "festes-majors" },
      extra: { place: "catalunya", year: expect.any(Number) },
    });
  });

  it("festa major calendar: an error after the reads is reported too", async () => {
    const bug = new TypeError("summarizeTowns bug");
    fetchAllEventPagesExternal.mockResolvedValue({ events: [], complete: true });
    summarizeTowns.mockImplementationOnce(() => {
      throw bug;
    });

    await expect(fetchFestaMajorCalendar()).resolves.toBeNull();

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(bug, expect.anything());
  });

  it.each([
    [true, { stale: 3600, revalidate: 21600, expire: 172800 }],
    [false, { stale: 300, revalidate: 3600, expire: 86400 }],
  ])("festa major calendar: a read that is complete=%s is stored accordingly", async (complete, life) => {
    fetchAllEventPagesExternal.mockResolvedValue({ events: [], complete });

    await expect(fetchFestaMajorCalendar()).resolves.toMatchObject({ complete });

    expect(cacheLife).toHaveBeenCalledWith(life);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("festivity page: reports once and renders as unavailable", async () => {
    const data = await fetchFestivityPage("fires-de-nadal");

    expect(data.available).toBe(false);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(backendFailure, {
      tags: { section: "festivities" },
      extra: { slug: "fires-de-nadal", seasonYear: expect.any(Number) },
    });
  });
});
