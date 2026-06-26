import { describe, it, expect } from "vitest";
import {
  snapCoordinate,
  buildNearbyCacheKey,
} from "@lib/places/nearby-cache-key";

describe("nearby cache key", () => {
  it("snaps coordinates to a ~1.1km grid", () => {
    expect(snapCoordinate(41.387654)).toBe(41.39);
    expect(snapCoordinate(2.169912)).toBe(2.17);
  });

  it("maps two locations ~700m apart onto the same key (one Google call serves both)", () => {
    const a = buildNearbyCacheKey(41.3851, 2.1734, 5000);
    const b = buildNearbyCacheKey(41.3879, 2.1699, 5000);
    expect(a).toBe(b);
  });

  it("keeps distant locations on separate keys", () => {
    const bcn = buildNearbyCacheKey(41.3851, 2.1734, 5000);
    const girona = buildNearbyCacheKey(41.9794, 2.8214, 5000);
    expect(bcn).not.toBe(girona);
  });

  it("does not depend on the event date — same coords/radius always yield the same key", () => {
    expect(buildNearbyCacheKey(41.39, 2.17, 5000)).toBe(
      "places:nearby:v1:41.39:2.17:r5000"
    );
  });

  it("separates keys by radius", () => {
    expect(buildNearbyCacheKey(41.39, 2.17, 5000)).not.toBe(
      buildNearbyCacheKey(41.39, 2.17, 1000)
    );
  });
});
