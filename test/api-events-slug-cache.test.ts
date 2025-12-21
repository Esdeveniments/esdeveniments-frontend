import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Avoid invoking Next's cache revalidation in unit tests
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

// Mock external fetch to avoid network and to assert call counts
vi.mock("@lib/api/events-external", () => ({
  fetchEventBySlug: vi.fn(),
}));

import { fetchEventBySlug } from "@lib/api/events-external";

const originalEnv = { ...process.env };

describe("/api/events/[slug] cache", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    (fetchEventBySlug as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("only fetches external event once per slug within TTL", async () => {
    const fakeEvent = {
      id: "1",
      slug: "some-slug",
      visits: 123,
      endDate: null,
    };

    (fetchEventBySlug as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeEvent
    );

    const { GET } = await import("app/api/events/[slug]/route");

    const req = new Request("http://localhost/api/events/some-slug");
    const ctx = { params: Promise.resolve({ slug: "some-slug" }) };

    const res1 = await GET(req, ctx as any);
    const res2 = await GET(req, ctx as any);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(fetchEventBySlug).toHaveBeenCalledTimes(1);

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1).toEqual(fakeEvent);
    expect(body2).toEqual(fakeEvent);
  });
});





