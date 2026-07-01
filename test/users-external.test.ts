import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import { getUserEventsExternal } from "../lib/api/users-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function pagedResponse(
  data: unknown,
  status = 200,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

const emptyPage = {
  content: [],
  currentPage: 0,
  pageSize: 20,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserEventsExternal", () => {
  it("requests /users/{username}/events with page & size", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(emptyPage));

    await getUserEventsExternal("sala-apolo", 2, 5);

    const [url] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/users/sala-apolo/events");
    expect(url).toContain("page=2");
    expect(url).toContain("size=5");
  });

  it("returns an empty page (no fetch) for a blank username", async () => {
    const result = await getUserEventsExternal("   ");
    expect(result.content).toEqual([]);
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });

  it("returns an empty page when the backend responds with an error", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(null, 500));
    const result = await getUserEventsExternal("sala-apolo");
    expect(result.content).toEqual([]);
    expect(result.last).toBe(true);
  });
});
