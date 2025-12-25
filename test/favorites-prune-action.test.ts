import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

describe("/api/favorites/prune", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValueByName.clear();

    cookieGetMock.mockImplementation((name: string) => {
      const value = cookieValueByName.get(name);
      return value === undefined ? undefined : { name, value };
    });
  });

  it("removes provided slugs and persists cookie", async () => {
    cookieValueByName.set(
      FAVORITES_COOKIE_NAME,
      JSON.stringify(["a", "b", "c"])
    );

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["b", " ", "missing"] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a", "c"] });
    expect(cookieSetMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is nothing to prune", async () => {
    cookieValueByName.set(FAVORITES_COOKIE_NAME, JSON.stringify(["a"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["", "   "] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a"] });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("does not write cookie when pruning changes nothing", async () => {
    cookieValueByName.set(FAVORITES_COOKIE_NAME, JSON.stringify(["a"]));

    const { POST } = await import("@app/api/favorites/prune/route");
    const response = await POST(
      new Request("http://localhost/api/favorites/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugsToRemove: ["missing"] }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, favorites: ["a"] });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });
});
