import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  getAuthenticatedUserExternal,
  getUserByUsernameExternal,
  getUserEventsExternal,
} from "../lib/api/users-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

// Pin the API URL so the test doesn't depend on env / api-defaults.json.
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
  isApiUrlConfigured: () => true,
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function pagedResponse(
  data: unknown,
  status = 200,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

const authenticatedUserDTO = {
  id: "orqbhkjfs6re",
  email: "gerard.rovellat@gmail.com",
  name: "gerard_rovellat",
  username: "gerard_rovellat",
  pictureUrl: "https://cdn.example.com/avatar.png",
  pictureSource: "LOGTO",
  role: "USER",
  lastLoginAt: "2026-07-02T10:00:00Z",
};

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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(pagedResponse(null, 500));
    const result = await getUserEventsExternal("sala-apolo");
    expect(result.content).toEqual([]);
    expect(result.last).toBe(true);
    // Non-404 failures must be greppable as distinct from "no events" —
    // otherwise an auth/config failure looks identical to a normal empty
    // profile in the logs.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("non-404 upstream failure HTTP 500")
    );
    errorSpy.mockRestore();
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

const userPublicDTO = {
  id: "e10c6a5f-306c-487f-9e71-876f67c7bbb2",
  displayName: "Esdeveniments Catalunya",
  username: "esdeveniments-catalunya-cat",
  avatarUrl: null,
  organizerVerified: false,
};

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe("getUserByUsernameExternal", () => {
  it("returns the parsed user on success", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(userPublicDTO));
    const result = await getUserByUsernameExternal(
      "esdeveniments-catalunya-cat"
    );
    expect(result?.username).toBe("esdeveniments-catalunya-cat");
  });

  it("returns null (no log) for a genuine 404", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(jsonResponse(null, 404));
    const result = await getUserByUsernameExternal("ghost");
    expect(result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns null but logs a distinct, greppable message for a non-404 failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({ error: "unauthorized" }, 401)
    );
    const result = await getUserByUsernameExternal("ajuntament-riudellots");
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("non-404 upstream failure HTTP 401")
    );
    errorSpy.mockRestore();
  });

  it("returns null on a network failure", async () => {
    mockFetchWithHmac.mockRejectedValue(new Error("network down"));
    const result = await getUserByUsernameExternal("sala-apolo");
    expect(result).toBeNull();
  });
});

describe("getAuthenticatedUserExternal", () => {
  it("requests /auth/me with a bearer token", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(authenticatedUserDTO));

    await getAuthenticatedUserExternal("some-access-token");

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchWithHmac.mock.calls[0];
    expect(url).toContain("/auth/me");
    expect((options?.headers as Record<string, string>).Authorization).toBe(
      "Bearer some-access-token",
    );
  });

  it("returns the backend profile fields on success", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(authenticatedUserDTO));

    const result = await getAuthenticatedUserExternal("some-access-token");

    expect(result).toEqual(authenticatedUserDTO);
  });

  it("returns null (no fetch) without an access token", async () => {
    const result = await getAuthenticatedUserExternal("");
    expect(result).toBeNull();
    expect(mockFetchWithHmac).not.toHaveBeenCalled();
  });

  it("throws with .status when the backend responds with an error", async () => {
    // Round 4 behavior change: instead of returning null on non-OK,
    // getAuthenticatedUserExternal throws with `.status` so
    // enrichWithBackendProfile can distinguish a 4xx Bearer rejection
    // (which tags AuthUser.profileEnrichmentFailed = "auth") from a Zod
    // miss / network failure (which returns null).
    mockFetchWithHmac.mockResolvedValue(pagedResponse(null, 500));
    await expect(
      getAuthenticatedUserExternal("some-access-token"),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("returns null (no throw) on a network failure", async () => {
    mockFetchWithHmac.mockRejectedValueOnce(new Error("network failure"));
    const result = await getAuthenticatedUserExternal("some-access-token");
    expect(result).toBeNull();
  });

  it("returns null on a malformed payload (no throw)", async () => {
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ unexpected: "shape" }, 200),
    );
    const result = await getAuthenticatedUserExternal("some-access-token");
    expect(result).toBeNull();
  });

  it("normalizes explicit nulls on optional fields to undefined", async () => {
    // The backend serializes unset optional fields as `null`, not an omitted
    // key — the schema must accept that shape, not just a missing key.
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({
        ...authenticatedUserDTO,
        pictureUrl: null,
        pictureSource: null,
        role: null,
        lastLoginAt: null,
      }),
    );

    const result = await getAuthenticatedUserExternal("some-access-token");

    expect(result).toEqual({
      id: authenticatedUserDTO.id,
      email: authenticatedUserDTO.email,
      name: authenticatedUserDTO.name,
      username: authenticatedUserDTO.username,
      pictureUrl: undefined,
      pictureSource: undefined,
      role: undefined,
      lastLoginAt: undefined,
    });
  });
});
