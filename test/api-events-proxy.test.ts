import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the server helper to avoid real network (external proxy layer)
vi.mock("@lib/api/events-external", () => {
  return {
    fetchEventsExternal: vi.fn(),
  };
});

import { GET } from "app/api/events/route";
import { fetchEventsExternal } from "@lib/api/events-external";

describe("/api/events proxy", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    (fetchEventsExternal as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("forwards filters and clamps page/size; sets cache headers", async () => {
    (
      fetchEventsExternal as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });

    const req = new Request(
      "http://localhost/api/events?page=-5&size=100&place=barcelona&category=music&byDate=avui&lat=41.3&lon=2.1&radius=999&term=rock&from=2025-01-01&to=2025-01-31"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=600, stale-while-revalidate=600"
    );

    // Verify mapping and clamping
    expect(fetchEventsExternal).toHaveBeenCalledTimes(1);
    const params = (fetchEventsExternal as any).mock.calls[0][0];
    expect(params.place).toBe("barcelona");
    expect(params.category).toBe("music");
    expect(params.byDate).toBe("avui");
    expect(params.term).toBe("rock");
    expect(params.from).toBe("2025-01-01");
    expect(params.to).toBe("2025-01-31");
    expect(params.page).toBe(0); // clamped from -5 to 0
    expect(params.size).toBe(50); // clamped from 100 to 50
    expect(params.lat).toBeCloseTo(41.3);
    expect(params.lon).toBeCloseTo(2.1);
    expect(params.radius).toBeCloseTo(999);
  });

  it("ignores invalid numeric params", async () => {
    (
      fetchEventsExternal as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });

    const req = new Request(
      "http://localhost/api/events?page=abc&size=xyz&lat=NaN&lon=NaN&radius=foo"
    );
    await GET(req);

    const params = (fetchEventsExternal as any).mock.calls[0][0];
    expect(params.page).toBeUndefined();
    expect(params.size).toBeUndefined();
    expect(params.lat).toBeUndefined();
    expect(params.lon).toBeUndefined();
    expect(params.radius).toBeUndefined();
  });
});
