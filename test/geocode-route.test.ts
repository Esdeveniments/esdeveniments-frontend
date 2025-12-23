import { describe, expect, it, vi, beforeEach } from "vitest";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

describe("/api/geocode route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("returns null for missing/short q and does not call upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("app/api/geocode/route");

    const res1 = await GET(new Request("http://local/api/geocode"));
    expect(await res1.json()).toBeNull();

    const res2 = await GET(new Request("http://local/api/geocode?q=ab"));
    expect(await res2.json()).toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes q, parses upstream response, and sets robust Cache-Control", async () => {
    const calls: FetchCall[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify([
          {
            lat: "41.390205",
            lon: "2.154007",
            display_name: "Barcelona, Catalunya",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("app/api/geocode/route");

    const res = await GET(
      new Request(
        "http://local/api/geocode?q=%20%20Carrer%20%20Major%20%2C%20%20Barcelona%20%20"
      )
    );

    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate");
    expect(res.headers.get("cache-control")).toContain("stale-if-error");

    const body = await res.json();
    expect(body).toEqual({
      lat: 41.390205,
      lon: 2.154007,
      displayName: "Barcelona, Catalunya",
    });

    expect(calls).toHaveLength(1);
    const calledUrl = new URL(calls[0].url);
    expect(calledUrl.hostname).toBe("nominatim.openstreetmap.org");
    expect(calledUrl.searchParams.get("q")).toBe("Carrer Major , Barcelona");

    // Ensure we send required UA header
    const initHeaders = calls[0].init?.headers as Record<string, string> | undefined;
    expect(initHeaders?.["User-Agent"]).toBeDefined();
  });

  it("caches identical queries in-process (only one upstream fetch)", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          {
            lat: "41.0",
            lon: "2.0",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("app/api/geocode/route");

    const r1 = await GET(new Request("http://local/api/geocode?q=Barcelona"));
    const r2 = await GET(new Request("http://local/api/geocode?q=Barcelona"));

    expect(await r1.json()).toEqual({ lat: 41, lon: 2, displayName: undefined });
    expect(await r2.json()).toEqual({ lat: 41, lon: 2, displayName: undefined });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when upstream is non-OK", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("app/api/geocode/route");

    const res = await GET(new Request("http://local/api/geocode?q=Barcelona"));
    expect(await res.json()).toBeNull();
  });
});
