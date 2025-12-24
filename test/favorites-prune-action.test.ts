import { describe, it, expect, vi, beforeEach } from "vitest";

const FAVORITES_COOKIE_NAME = "user_favorites";

type CookieGetResult = { name: string; value: string } | undefined;

const cookieValueByName = new Map<string, string>();
const cookieGetMock = vi.fn<(name: string) => CookieGetResult>();
const cookieSetMock = vi.fn<(name: string, value: string) => void>();

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

describe("pruneFavoritesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValueByName.clear();

    cookieGetMock.mockImplementation((name: string) => {
      const value = cookieValueByName.get(name);
      return value === undefined ? undefined : { name, value };
    });
  });

  it("removes provided slugs and persists cookie", async () => {
    cookieValueByName.set(FAVORITES_COOKIE_NAME, JSON.stringify(["a", "b", "c"]));

    const { pruneFavoritesAction } = await import("@app/actions/favorites");
    const result = await pruneFavoritesAction(["b", " ", "missing"]);

    expect(result).toEqual(["a", "c"]);
    expect(cookieSetMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorits");
  });

  it("does nothing when there is nothing to prune", async () => {
    cookieValueByName.set(FAVORITES_COOKIE_NAME, JSON.stringify(["a"]));

    const { pruneFavoritesAction } = await import("@app/actions/favorites");
    const result = await pruneFavoritesAction(["", "   "]);

    expect(result).toEqual(["a"]);
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("does not write cookie when pruning changes nothing", async () => {
    cookieValueByName.set(FAVORITES_COOKIE_NAME, JSON.stringify(["a"]));

    const { pruneFavoritesAction } = await import("@app/actions/favorites");
    const result = await pruneFavoritesAction(["missing"]);

    expect(result).toEqual(["a"]);
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
