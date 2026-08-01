import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  listFavoriteEventsExternal,
  listFavoriteEventsByPeriodExternal,
  countFavoritesByPeriodExternal,
  getFavoritePeriodCounts,
} from "../lib/api/favorites-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
  isApiUrlConfigured: () => true,
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function pagedResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

function page(content: unknown[], totalElements = content.length) {
  return {
    content,
    currentPage: 0,
    pageSize: 10,
    totalElements,
    totalPages: 1,
    last: true,
  };
}

function makeEvent(slug: string) {
  return {
    id: `id-${slug}`,
    hash: `hash-${slug}`,
    slug,
    title: `Title ${slug}`,
    type: "FREE" as const,
    url: "https://example.com",
    description: "desc",
    imageUrl: "https://example.com/img.jpg",
    startDate: "2030-01-01",
    startTime: null,
    endDate: "2030-01-02",
    endTime: null,
    location: "loc",
    visits: 0,
    origin: "MANUAL" as const,
    categories: [],
  };
}

const activeEvent = makeEvent("active-event");
const pastEvent = makeEvent("past-event");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFavoriteEventsExternal", () => {
  it("requests both period=active and period=past", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(page([])));

    await listFavoriteEventsExternal("token", 0, 10);

    const urls = mockFetchWithHmac.mock.calls.map((call) => call[0] as string);
    expect(urls.some((url) => url.includes("period=active"))).toBe(true);
    expect(urls.some((url) => url.includes("period=past"))).toBe(true);
  });

  it("merges active and past content into one list", async () => {
    mockFetchWithHmac.mockImplementation(async (url) => {
      const u = url as string;
      if (u.includes("period=active")) {
        return pagedResponse(page([activeEvent]));
      }
      return pagedResponse(page([pastEvent]));
    });

    const result = await listFavoriteEventsExternal("token", 0, 10);

    expect(result?.content.map((e) => e.slug)).toEqual([
      "active-event",
      "past-event",
    ]);
    expect(result?.currentPage).toBe(0);
    expect(result?.pageSize).toBe(20);
    expect(result?.totalElements).toBe(2);
    expect(result?.totalPages).toBe(1);
    expect(result?.last).toBe(true);
  });

  it("returns null when the active period call fails, even if past succeeds", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockImplementation(async (url) => {
      const u = url as string;
      if (u.includes("period=active")) {
        return pagedResponse({ error: "backend_down" }, 500);
      }
      return pagedResponse(page([pastEvent]));
    });

    const result = await listFavoriteEventsExternal("token", 0, 10);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });

  it("reports pageSize/totalPages consistent with content when both legs are full", async () => {
    const size = 10;
    const activeContent = Array.from({ length: size }, (_, i) =>
      makeEvent(`active-${i}`)
    );
    const pastContent = Array.from({ length: size }, (_, i) =>
      makeEvent(`past-${i}`)
    );
    mockFetchWithHmac.mockImplementation(async (url) => {
      const u = url as string;
      if (u.includes("period=active")) {
        return pagedResponse(page(activeContent, size));
      }
      return pagedResponse(page(pastContent, size));
    });

    const result = await listFavoriteEventsExternal("token", 0, size);

    expect(result?.content.length).toBe(2 * size);
    expect(result?.content.length).toBeLessThanOrEqual(result!.pageSize);
    expect(result?.totalElements).toBe(2 * size);
    expect(result?.totalPages).toBe(
      Math.ceil(result!.totalElements / result!.pageSize)
    );
  });

  it("returns null when the past period call fails, even if active succeeds", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockImplementation(async (url) => {
      const u = url as string;
      if (u.includes("period=past")) {
        return pagedResponse({ error: "backend_down" }, 500);
      }
      return pagedResponse(page([activeEvent]));
    });

    const result = await listFavoriteEventsExternal("token", 0, 10);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });
});

describe("listFavoriteEventsByPeriodExternal", () => {
  it("requests only the given period, not both", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(page([activeEvent])));

    await listFavoriteEventsByPeriodExternal("token", "active", 0, 10);

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const url = mockFetchWithHmac.mock.calls[0][0] as string;
    expect(url).toContain("period=active");
    expect(url).not.toContain("period=past");
  });

  it("returns null when the backend call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ error: "backend_down" }, 500)
    );

    const result = await listFavoriteEventsByPeriodExternal("token", "past", 0, 10);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });
});

describe("getFavoritePeriodCounts", () => {
  it("fetches active and past counts in parallel", async () => {
    mockFetchWithHmac.mockImplementation(async (url) => {
      const totalElements = (url as string).includes("period=active") ? 3 : 1;
      return pagedResponse(page([activeEvent], totalElements));
    });

    await expect(getFavoritePeriodCounts("token")).resolves.toEqual({
      activeCount: 3,
      pastCount: 1,
    });

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(2);
    const urls = mockFetchWithHmac.mock.calls.map((call) => call[0] as string);
    expect(urls.some((url) => url.includes("period=active"))).toBe(true);
    expect(urls.some((url) => url.includes("period=past"))).toBe(true);
  });
});

describe("countFavoritesByPeriodExternal", () => {
  it("returns totalElements from a size=1 fetch", async () => {
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse(page([activeEvent], 7))
    );

    const count = await countFavoritesByPeriodExternal("token", "active");

    expect(count).toBe(7);
    const url = mockFetchWithHmac.mock.calls[0][0] as string;
    expect(url).toContain("size=1");
  });

  it("returns null when the backend call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ error: "backend_down" }, 500)
    );

    const count = await countFavoritesByPeriodExternal("token", "past");

    expect(count).toBeNull();
    errorSpy.mockRestore();
  });
});
