import { describe, expect, it } from "vitest";

import { EVENTS_PATTERN, PUBLIC_API_PATTERNS } from "../proxy";

const matchesPublicApi = (pathname: string) =>
  PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname));

describe("proxy public API patterns", () => {
  it("allow URL-encoded slugs across dynamic routes", () => {
    expect(matchesPublicApi("/api/places/lli%C3%A7%C3%A0%20de%20vall")).toBe(
      true
    );
    expect(matchesPublicApi("/api/cities/barcelona%20ciutat")).toBe(true);
    expect(matchesPublicApi("/api/regions/girona%20nord")).toBe(true);
    expect(matchesPublicApi("/api/news/festa%20major")).toBe(true);
  });

  it("keep existing non-slug paths allowed", () => {
    expect(matchesPublicApi("/api/regions/options")).toBe(true);
    expect(matchesPublicApi("/api/places/nearby")).toBe(true);
    expect(matchesPublicApi("/api/places/photo")).toBe(true);
  });

  it("reject nested paths beyond a single segment", () => {
    expect(matchesPublicApi("/api/places/foo/bar")).toBe(false);
    expect(matchesPublicApi("/api/regions/girona/sub")).toBe(false);
  });
});

describe("events pattern", () => {
  it("allows encoded slugs and categorized route", () => {
    expect(EVENTS_PATTERN.test("/api/events/el%20festival")).toBe(true);
    expect(EVENTS_PATTERN.test("/api/events/categorized")).toBe(true);
  });

  it("rejects nested event paths", () => {
    expect(EVENTS_PATTERN.test("/api/events/foo/bar")).toBe(false);
  });
});

