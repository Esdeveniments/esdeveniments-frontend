import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "app/api/events/route";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import { fetchEventsExternal } from "@lib/api/events-external";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));

const emptyPage = {
  content: [],
  currentPage: 0,
  pageSize: 12,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

beforeEach(() => {
  vi.mocked(fetchWithHmac).mockReset();
});

describe("events API outage distinction", () => {
  it("keeps a genuine empty page successful and cacheable", async () => {
    vi.mocked(fetchWithHmac).mockResolvedValue(Response.json(emptyPage));

    const response = await GET(new Request("http://localhost/api/events"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(emptyPage);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=1800");
  });

  it.each([401, 429, 500, 503])(
    "preserves upstream HTTP %i without caching an empty success",
    async (status) => {
      vi.mocked(fetchWithHmac).mockResolvedValue(
        new Response("private upstream details", { status }),
      );

      const response = await GET(new Request("http://localhost/api/events"));

      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "Events service unavailable" });
    },
  );

  it.each([
    new Response("<html>unavailable</html>"),
    Response.json({ content: [] }),
  ])("rejects malformed upstream success responses", async (upstream) => {
    vi.mocked(fetchWithHmac).mockResolvedValue(upstream);

    const response = await GET(new Request("http://localhost/api/events"));

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Events service unavailable" });
  });

  it.each([
    [new TypeError("fetch failed"), 502],
    [new DOMException("aborted", "AbortError"), 504],
    [new DOMException("timed out", "TimeoutError"), 504],
  ])("reports transport failure %s as HTTP %i", async (error, status) => {
    vi.mocked(fetchWithHmac).mockRejectedValue(error);

    const response = await GET(new Request("http://localhost/api/events"));

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("retains the safe fallback for server callers", async () => {
    vi.mocked(fetchWithHmac).mockRejectedValue(new TypeError("fetch failed"));

    expect(await fetchEventsExternal({})).toEqual(emptyPage);
  });

  it("returns fresh data after an upstream failure", async () => {
    vi.mocked(fetchWithHmac)
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(emptyPage));

    expect((await GET(new Request("http://localhost/api/events"))).status).toBe(503);
    expect((await GET(new Request("http://localhost/api/events"))).status).toBe(200);
    expect(fetchWithHmac).toHaveBeenCalledTimes(2);
  });
});
