import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lib/api/events-external", () => ({
  fetchEventCountExternal: vi.fn(),
}));

import { getPlaceExpandability } from "@lib/seo/place-expandability";
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
