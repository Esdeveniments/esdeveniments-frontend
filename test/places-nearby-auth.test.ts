import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const getCurrentUser = vi.fn();
vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

const cacheGetJson = vi.fn();
vi.mock("@lib/cache/redis-client", () => ({
  cacheGetJson: (...args: unknown[]) => cacheGetJson(...args),
  cacheSetJson: vi.fn(),
}));

import { GET } from "@app/api/places/nearby/route";

const request = () =>
  new NextRequest("http://localhost/api/places/nearby?lat=41.9&lng=2.2");

describe("GET /api/places/nearby auth", () => {
  it("returns 401 without touching Google or the cache when the session doesn't verify", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(cacheGetJson).not.toHaveBeenCalled();
  });
});
