import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const FAVORITES_COOKIE_NAME = "user_favorites";

type CookieGetResult = { name: string; value: string } | undefined;

const cookieValueByName = new Map<string, string>();
const cookieGetMock = vi.fn<(name: string) => CookieGetResult>();
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
  set: cookieSetMock,
}));

const revalidatePathMock = vi.fn<(path: string) => void>();

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
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

describe("favorites server actions", () => {
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

  it("does nothing for empty/whitespace slug", async () => {
    setFavoritesCookieValue(JSON.stringify(["a"]));

    const { setFavoriteAction } = await import("@app/actions/favorites");
    const result = await setFavoriteAction("   ", true);

    expect(result).toEqual(["a"]);
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("adds a favorite and persists httpOnly cookie", async () => {
    const { setFavoriteAction } = await import("@app/actions/favorites");

    const result = await setFavoriteAction("  test-slug  ", true);

    expect(result).toEqual(["test-slug"]);
    expect(cookieSetMock).toHaveBeenCalledTimes(1);

    const [name, value, options] = cookieSetMock.mock.calls[0] ?? [];
    expect(name).toBe(FAVORITES_COOKIE_NAME);
    expect(parseCookieArray(value as string)).toEqual(["test-slug"]);
    expect(options).toMatchObject({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/preferits");
  });

  it("removes a favorite", async () => {
    setFavoritesCookieValue(JSON.stringify(["a", "b"]));

    const { setFavoriteAction } = await import("@app/actions/favorites");
    const result = await setFavoriteAction("a", false);

    expect(result).toEqual(["b"]);
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(["b"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/preferits");
  });

  it("does not duplicate favorites", async () => {
    setFavoritesCookieValue(JSON.stringify(["a"]));

    const { setFavoriteAction } = await import("@app/actions/favorites");
    const result = await setFavoriteAction("a", true);

    expect(result).toEqual(["a"]);
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(["a"]);
  });

  it("enforces MAX_FAVORITES cap (does not exceed 50)", async () => {
    const { MAX_FAVORITES } = await import("@utils/favorites");
    const current = Array.from({ length: MAX_FAVORITES }, (_, i) => `s-${i}`);
    setFavoritesCookieValue(JSON.stringify(current));

    // Semantics decision: when already at MAX_FAVORITES, adding a NEW favorite
    // evicts the oldest favorite (first-added) to make room for the newest.
    // This ensures the add action succeeds while keeping the list capped.
    const expected = [...current.slice(1), "new-one"];

    const { setFavoriteAction } = await import("@app/actions/favorites");
    const result = await setFavoriteAction("new-one", true);

    expect(result).toHaveLength(MAX_FAVORITES);
    expect(result).toEqual(expected);
    expect(parseCookieArray(getPersistedFavoritesValue())).toEqual(expected);
  });

  it("sets secure cookies only in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };

    const { setFavoriteAction } = await import("@app/actions/favorites");
    await setFavoriteAction("secure-check", true);

    const options = cookieSetMock.mock.calls[0]?.[2];
    expect(options?.secure).toBe(true);
  });
});
