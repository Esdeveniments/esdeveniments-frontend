import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import { GET } from "../app/api/users/[username]/events/route";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
  isApiUrlConfigured: () => true,
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

const backendResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }) as Response;

const page = {
  content: [],
  currentPage: 1,
  pageSize: 20,
  totalElements: 20,
  totalPages: 1,
  last: true,
};

const get = (query: string, username = "sala-apolo") =>
  GET(new Request(`http://localhost/api/users/${username}/events${query}`), {
    params: Promise.resolve({ username }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/users/[username]/events", () => {
  it("rejects a missing or unknown status without calling the backend", async () => {
    for (const query of ["", "?status=all"]) {
      const res = await get(query);
      expect(res.status).toBe(400);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });

  it("forwards page, a clamped size and the period, and lets the CDN cache the page", async () => {
    mockFetchWithHmac.mockResolvedValue(backendResponse(page));
    const res = await get("?status=past&page=1&size=500");

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=1800");
    const url = mockFetchWithHmac.mock.calls[0][0] as string;
    expect(url).toContain("/users/sala-apolo/events");
    expect(url).toContain("page=1");
    expect(url).toContain("size=50");
    expect(url).toContain("period=past");
  });

  it("passes a backend 404 through and keeps it out of the CDN", async () => {
    mockFetchWithHmac.mockResolvedValue(backendResponse({}, 404));
    const res = await get("?status=upcoming&page=1");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers 502, never an empty page, when the backend fails", async () => {
    mockFetchWithHmac.mockResolvedValue(backendResponse({}, 500));
    const failed = await get("?status=upcoming&page=1");
    expect(failed.status).toBe(502);
    expect(failed.headers.get("Cache-Control")).toBe("no-store");

    mockFetchWithHmac.mockResolvedValue(backendResponse({ content: "nope" }));
    expect((await get("?status=upcoming&page=1")).status).toBe(502);
  });
});
