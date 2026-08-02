import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@lib/api/events-external", () => ({
  fetchEventCountExternal: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn((path: string) =>
    Promise.resolve(`http://localhost:3000${path}`),
  ),
  getVercelProtectionBypassHeaders: vi.fn(() => ({})),
}));

import {
  getPlaceExpandability,
  getPlaceExpandabilityForMetadata,
} from "@lib/seo/place-expandability";
import { fetchEventCountExternal } from "@lib/api/events-external";

const mockedFetchCount = vi.mocked(fetchEventCountExternal);

describe("getPlaceExpandability", () => {
  beforeEach(() => {
    mockedFetchCount.mockReset();
  });

  it("returns true for regions without calling the API", async () => {
    const result = await getPlaceExpandability("valles-occidental", "region");
    expect(result).toBe(true);
    expect(mockedFetchCount).not.toHaveBeenCalled();
  });

  it("returns true for catalunya without calling the API", async () => {
    const result = await getPlaceExpandability("catalunya", "town");
    expect(result).toBe(true);
    expect(mockedFetchCount).not.toHaveBeenCalled();
  });

  it("returns true for empty slug without calling the API", async () => {
    const result = await getPlaceExpandability("", "town");
    expect(result).toBe(true);
    expect(mockedFetchCount).not.toHaveBeenCalled();
  });

  it("returns false for towns below the threshold", async () => {
    mockedFetchCount.mockResolvedValueOnce(12);
    const result = await getPlaceExpandability("begues", "town");
    expect(result).toBe(false);
  });

  it("returns true for towns at or above the threshold", async () => {
    mockedFetchCount.mockResolvedValueOnce(40);
    const result = await getPlaceExpandability("sabadell", "town");
    expect(result).toBe(true);
  });

  it("fails open (returns true) when the API returns null", async () => {
    mockedFetchCount.mockResolvedValueOnce(null);
    const result = await getPlaceExpandability("transient-failure", "town");
    expect(result).toBe(true);
  });
});

describe("getPlaceExpandabilityForMetadata", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for regions without calling the internal API", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await getPlaceExpandabilityForMetadata(
      "valles-occidental",
      "region",
    );
    expect(result).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns false for towns below the threshold", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ totalElements: 12 }),
      }),
    );
    const result = await getPlaceExpandabilityForMetadata("begues", "town");
    expect(result).toBe(false);
  });

  it("returns true for towns at or above the threshold", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ totalElements: 40 }),
      }),
    );
    const result = await getPlaceExpandabilityForMetadata("sabadell", "town");
    expect(result).toBe(true);
  });

  it("fails open (returns true) when the internal API returns non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await getPlaceExpandabilityForMetadata(
      "transient-failure",
      "town",
    );
    expect(result).toBe(true);
  });
});
