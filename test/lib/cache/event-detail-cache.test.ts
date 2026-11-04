import { describe, it, expect, vi } from "vitest";

describe("event-detail-cache", () => {
  it("is shared across separately loaded copies of the module", async () => {
    const first = await import("@lib/cache/event-detail-cache");
    const fetcher = vi.fn().mockResolvedValue({ slug: "evt" });
    await first.eventDetailCache("evt", fetcher);

    vi.resetModules();
    const second = await import("@lib/cache/event-detail-cache");
    expect(second.eventDetailCache).toBe(first.eventDetailCache);

    second.deleteEventDetailCache("evt");
    await first.eventDetailCache("evt", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
