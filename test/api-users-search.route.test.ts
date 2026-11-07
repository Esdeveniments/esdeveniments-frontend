import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import { GET } from "../app/api/users/route";
import { parseUserSearchResults } from "../lib/validation/user";

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

const begudes = {
  username: "begudesambclasse",
  displayName: "Begudes amb Classe",
  avatarUrl: "https://cdn.example.com/a.png",
  verified: true,
  role: "ORGANIZATION",
  upcomingEventCount: 2,
};

const get = (query: string) => GET(new Request(`http://localhost/api/users${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("parseUserSearchResults", () => {
  it("keeps valid rows, drops bad usernames and defaults odd fields", () => {
    expect(
      parseUserSearchResults([
        begudes,
        { ...begudes, username: "../admin" },
        { username: "lauditori", displayName: "", avatarUrl: null, role: "NEW", verified: null },
      ]),
    ).toEqual([
      begudes,
      {
        username: "lauditori",
        displayName: null,
        avatarUrl: null,
        verified: false,
        role: "USER",
        upcomingEventCount: 0,
      },
    ]);
  });

  it("returns null when the payload isn't an array", () => {
    expect(parseUserSearchResults({ content: [] })).toBeNull();
  });
});

describe("GET /api/users", () => {
  it("forwards q and size and caches a success briefly", async () => {
    mockFetchWithHmac.mockResolvedValue(backendResponse([begudes]));
    const response = await get("?q=begudes%20amb%20classe&size=3");

    expect(mockFetchWithHmac).toHaveBeenCalledWith(
      "http://localhost:8080/api/users?q=begudes+amb+classe&size=3",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    expect(await response.json()).toEqual([begudes]);
  });

  it("defaults size to 5 and trims extra rows", async () => {
    mockFetchWithHmac.mockResolvedValue(
      backendResponse(Array.from({ length: 7 }, (_, i) => ({ ...begudes, username: `u${i}` }))),
    );
    const response = await get("?q=begudes");

    expect(mockFetchWithHmac).toHaveBeenCalledWith(
      "http://localhost:8080/api/users?q=begudes&size=5",
    );
    expect(await response.json()).toHaveLength(5);
  });

  it.each(["", "?size=5", `?q=${"a".repeat(101)}`, "?q=ab&size=0", "?q=ab&size=11", "?q=ab&size=2.5", "?q=ab&size=x"])(
    "answers 400 without calling the backend for %j",
    async (query) => {
      const response = await get(query);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(mockFetchWithHmac).not.toHaveBeenCalled();
    },
  );

  it.each(["", "l'", "%%__", "a", "🎉"])("returns [] for %s without calling the backend", async (q) => {
    const response = await get(`?q=${encodeURIComponent(q)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });

  it.each([
    ["a backend error", () => mockFetchWithHmac.mockResolvedValue(backendResponse({}, 503))],
    ["a 404 (endpoint not deployed)", () => mockFetchWithHmac.mockResolvedValue(backendResponse({}, 404))],
    ["an invalid payload", () => mockFetchWithHmac.mockResolvedValue(backendResponse({ content: [] }))],
    ["a network error", () => mockFetchWithHmac.mockRejectedValue(new Error("timeout"))],
  ])("answers 502 no-store on %s", async (_label, arrange) => {
    arrange();
    const response = await get("?q=begudes");
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
