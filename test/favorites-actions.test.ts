import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FAVORITES_COOKIE_NAME } from "@utils/favorites";

type CookieGetResult = { name: string; value: string } | undefined;

const cookieValueByName = new Map<string, string>();
const cookieGetMock = vi.fn<(name: string) => CookieGetResult>();
const cookieDeleteMock = vi.fn<(name: string) => void>();
const cookieSetMock = vi.fn<
  (
    name: string,
    value: string,
    options: {
      path: string;
      maxAge: number;
      sameSite: "lax" | "strict" | "none";
      httpOnly: boolean;
      secure: boolean;
    }
  ) => void
>();

const cookiesMock = vi.fn(async () => ({
  get: cookieGetMock,
  delete: cookieDeleteMock,
  set: cookieSetMock,
}));

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

function setFavoritesCookieValue(value: string): void {
  cookieValueByName.set(FAVORITES_COOKIE_NAME, value);
}

function getPersistedFavoritesValue(): string {
  const calls = cookieSetMock.mock.calls;
  if (calls.length === 0) return "";
  return calls[calls.length - 1]?.[1] ?? "";
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseCookieArray(raw: string): string[] {
  const decoded = decodeCookieValue(raw);
  const parsed = JSON.parse(decoded) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((v): v is string => typeof v === "string")
    : [];
}

const originalEnv = { ...process.env };

describe("/api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValueByName.clear();

    cookieGetMock.mockImplementation((name: string) => {
      const value = cookieValueByName.get(name);
      return value === undefined ? undefined : { name, value };
    });

    process.env = { ...originalEnv, NODE_ENV: "test" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 400 EMPTY_EVENT_SLUG for empty/whitespace slug and does not write cookie", async () => {
    setFavoritesCookieValue(JSON.stringify(["a"]));

    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "   ", shouldBeFavorite: true }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "EMPTY_EVENT_SLUG",
    });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("adds a favorite and persists httpOnly cookie", async () => {
    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: "  test-slug  ",
          shouldBeFavorite: true,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      favorites: ["test-slug"],
    });
    expect(cookieSetMock).toHaveBeenCalledTimes(1);

    const [name, value, options] = cookieSetMock.mock.calls[0] ?? [];
    expect(name).toBe(FAVORITES_COOKIE_NAME);
    expect(parseCookieArray(value as string)).toEqual(["test-slug"]);
    expect(options).toMatchObject({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("removes a favorite", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b"]));

    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "a", shouldBeFavorite: false }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["b"] });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(["b"]);
  });

  it("deletes favorites cookie when removing the last favorite", async () => {
    setFavoritesCookieValue(JSON.stringify(["a"]));

    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "a", shouldBeFavorite: false }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: [] });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(cookieDeleteMock).toHaveBeenCalledWith(FAVORITES_COOKIE_NAME);
  });

  it("does not duplicate favorites", async () => {
    setFavoritesCookieValue(JSON.stringify(["a"]));

    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "a", shouldBeFavorite: true }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a"] });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(["a"]);
  });

  it("treats re-adding an existing favorite as most recent (LRU-like)", async () => {
    const { MAX_FAVORITES } = await import("@utils/favorites");
    const current = Array.from({ length: MAX_FAVORITES }, (_, i) => `s-${i}`);
    setFavoritesCookieValue(JSON.stringify(current));

    const { POST } = await import("@app/api/favorites/route");

    // Refresh s-0 recency (move it to end)
    const refreshResponse = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "s-0", shouldBeFavorite: true }),
      })
    );

    const refreshed = [...current.slice(1), "s-0"];
    expect(refreshResponse.status).toBe(200);
    expect(await refreshResponse.json()).toEqual({
      ok: true,
      favorites: refreshed,
    });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(refreshed);

    // Simulate a follow-up request by carrying forward the latest cookie value and
    // resetting module cache so React/Next `cache()` doesn't reuse prior cookie reads.
    setFavoritesCookieValue(getPersistedFavoritesValue());
    vi.resetModules();

    const { POST: POST2 } = await import("@app/api/favorites/route");

    // Now adding a new favorite should be rejected (no silent eviction).
    const addResponse = await POST2(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "new-one", shouldBeFavorite: true }),
      })
    );

    expect(addResponse.status).toBe(409);
    expect(await addResponse.json()).toEqual({
      ok: false,
      error: "MAX_FAVORITES_REACHED",
      maxFavorites: MAX_FAVORITES,
    });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(refreshed);
  });

  it("enforces MAX_FAVORITES cap (rejects new favorite when full)", async () => {
    const { MAX_FAVORITES } = await import("@utils/favorites");
    const current = Array.from({ length: MAX_FAVORITES }, (_, i) => `s-${i}`);
    setFavoritesCookieValue(JSON.stringify(current));

    const { POST } = await import("@app/api/favorites/route");
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: "new-one", shouldBeFavorite: true }),
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "MAX_FAVORITES_REACHED",
      maxFavorites: MAX_FAVORITES,
    });

    // No cookie write on rejection
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("sets secure cookies only in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };

    const { POST } = await import("@app/api/favorites/route");
    await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: "secure-check",
          shouldBeFavorite: true,
        }),
      })
    );

    const options = cookieSetMock.mock.calls[0]?.[2];
    expect(options?.secure).toBe(true);
  });
});
