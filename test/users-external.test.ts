import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import { getUserEventsExternal } from "../lib/api/users-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

// Pin the API URL so the test doesn't depend on env / api-defaults.json.
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
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

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
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

  it("treats a 404 (unknown user) as an empty page", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(null, 404));
    const result = await getUserEventsExternal("ghost");
    expect(result.content).toEqual([]);
  });

  it("treats a malformed 200 payload as an empty page (no throw)", async () => {
    // Backend returning 200 with a non-paged/error body must not surface as a
    // crash or as fake data: parsePagedEvents rejects it → empty page, so the
    // profile renders "no events" instead of throwing in a server component.
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ error: "Internal Server Error" }, 200),
    );
    const result = await getUserEventsExternal("sala-apolo");
    expect(result.content).toEqual([]);
    expect(result.last).toBe(true);
  });
});
