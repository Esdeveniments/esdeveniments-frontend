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

describe("persistFavoritesCookie", () => {
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

  it("returns the capped list and persists that exact list", async () => {
    const { MAX_FAVORITES, persistFavoritesCookie } = await import(
      "@utils/favorites"
    );

    const favorites = Array.from(
      { length: MAX_FAVORITES + 7 },
      (_, i) => `slug-${i}`
    );

    const persisted = await persistFavoritesCookie(favorites);

    expect(persisted).toHaveLength(MAX_FAVORITES);
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(persisted);
  });

  it("deletes the cookie when persisting an empty list", async () => {
    const { persistFavoritesCookie } = await import("@utils/favorites");
    const persisted = await persistFavoritesCookie([]);

    expect(persisted).toEqual([]);
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(cookieDeleteMock).toHaveBeenCalledWith(FAVORITES_COOKIE_NAME);
  });
});

describe("/api/favorites/prune", () => {
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

  it("returns current favorites for empty removals and does not write cookie", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: [] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a", "b"] });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("prunes favorites, persists cookie, and response matches persisted value", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b", "c"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["b"] }),
      })
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      ok: boolean;
      favorites: string[];
    };
    expect(json).toEqual({ ok: true, favorites: ["a", "c"] });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(
      json.favorites
    );
  });

  it("trims and ignores empty removal slugs", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b", "c"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["  b  ", "", "   "] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a", "c"] });
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(["a", "c"]);
  });

  it("prunes all favorites and deletes cookie", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["a", "b"] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: [] });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(cookieDeleteMock).toHaveBeenCalledWith(FAVORITES_COOKIE_NAME);
  });
});
