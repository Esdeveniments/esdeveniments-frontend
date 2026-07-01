import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  fetchFavoriteEventsExternal,
  getFavoriteStatusExternal,
  setFavoriteExternal,
} from "../lib/api/favorites-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("favorites-external", () => {
  it("forwards the Bearer token when listing favourites", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({
        content: [],
        currentPage: 0,
        pageSize: 12,
        totalElements: 0,
        totalPages: 0,
        last: true,
      }),
    );

    await fetchFavoriteEventsExternal("tok-123", 1, 5);

    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/me/favorites/events");
    expect(url).toContain("page=1");
    expect(url).toContain("size=5");
    expect(
      (options?.headers as Record<string, string>)?.Authorization,
    ).toBe("Bearer tok-123");
  });

  it("reads the favourite flag from the status endpoint", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse({ favorite: true }));
    const result = await getFavoriteStatusExternal("tok", "evt-1");
    expect(result).toBe(true);
    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/me/favorites/events/evt-1");
    expect(
      (options?.headers as Record<string, string>)?.Authorization,
    ).toBe("Bearer tok");
  });

  it("returns false when the status call is not ok", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 401));
    expect(await getFavoriteStatusExternal("tok", "evt-1")).toBe(false);
  });

  it("POSTs to add and DELETEs to remove a favourite", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 200));

    await setFavoriteExternal("tok", "evt-9", true);
    expect(mockFetchWithHmac.mock.calls[0][1]?.method).toBe("POST");

    await setFavoriteExternal("tok", "evt-9", false);
    expect(mockFetchWithHmac.mock.calls[1][1]?.method).toBe("DELETE");
  });
});
