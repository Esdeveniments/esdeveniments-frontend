import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { cacheLife, cacheTag, connection } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  connection: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection,
}));

vi.mock("@lib/validation/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/validation/event")>()),
  parsePagedEvents: vi.fn((raw: unknown) => raw),
}));

import { fetchEventsCached } from "@lib/api/events";

const page = (title: string) => ({
  content: [{ id: "1", title }],
  currentPage: 0,
  pageSize: 10,
  totalElements: 1,
  totalPages: 1,
  last: true,
});
const fetchMock = vi.fn();

describe("fetchEventsCached", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
    connection.mockClear();
  });

  it("reads the events page inside the cache without connection()", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(page("Cached")), { status: 200 }));

    const result = await fetchEventsCached({ page: 0, size: 10, place: "cardedeu" });

    expect(result.content[0]).toMatchObject({ title: "Cached" });
    expect(cacheTag).toHaveBeenCalledWith("events");
    expect(cacheLife).toHaveBeenCalledWith({ stale: 300, revalidate: 600, expire: 3600 });
    expect(connection).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/events\?page=0&size=10&place=cardedeu$/);
  });

  it("falls back to fetchEvents when the cached read fails, so the error is not cached", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("boom", { status: 503 }))
      .mockResolvedValue(new Response(JSON.stringify(page("Fresh")), { status: 200 }));

    const result = await fetchEventsCached({ page: 0, size: 10, place: "cardedeu" });

    expect(result.content[0]).toMatchObject({ title: "Fresh" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
