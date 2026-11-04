import { describe, it, expect, vi, beforeEach } from "vitest";
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

const getValidAccessTokenMock = vi.fn<() => Promise<string | null>>();
vi.mock("@utils/auth-cookies", () => ({
  getValidAccessToken: () => getValidAccessTokenMock(),
}));

const removeFavoriteEventExternalMock = vi.fn<
  (accessToken: string, eventId: string) => Promise<{ ok: boolean; status: number }>
>();
vi.mock("@lib/api/favorites-external", () => ({
  removeFavoriteEventExternal: (accessToken: string, eventId: string) =>
    removeFavoriteEventExternalMock(accessToken, eventId),
}));

const captureExceptionMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

describe("/api/favorites/prune", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValueByName.clear();

    cookieGetMock.mockImplementation((name: string) => {
      const value = cookieValueByName.get(name);
      return value === undefined ? undefined : { name, value };
    });

    // Guest by default; authed tests override this.
    getValidAccessTokenMock.mockResolvedValue(null);
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

  describe("authenticated branch", () => {
    beforeEach(() => {
      getValidAccessTokenMock.mockResolvedValue("token");
    });

    it("removes each event id and never touches cookies", async () => {
      removeFavoriteEventExternalMock.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const { POST } = await import("@app/api/favorites/prune/route");
      const response = await POST(
        new Request("http://localhost/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIdsToRemove: ["id-1", "id-2"] }),
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(removeFavoriteEventExternalMock).toHaveBeenCalledTimes(2);
      expect(removeFavoriteEventExternalMock).toHaveBeenCalledWith(
        "token",
        "id-1"
      );
      expect(removeFavoriteEventExternalMock).toHaveBeenCalledWith(
        "token",
        "id-2"
      );
      expect(cookieGetMock).not.toHaveBeenCalled();
      expect(cookieSetMock).not.toHaveBeenCalled();
      expect(cookieDeleteMock).not.toHaveBeenCalled();
      expect(captureExceptionMock).not.toHaveBeenCalled();
    });

    it("treats a 404 as an idempotent no-op, not a failure", async () => {
      removeFavoriteEventExternalMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { POST } = await import("@app/api/favorites/prune/route");
      const response = await POST(
        new Request("http://localhost/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIdsToRemove: ["already-gone"] }),
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(captureExceptionMock).not.toHaveBeenCalled();
    });

    it("still returns ok but reports a real backend failure to Sentry", async () => {
      removeFavoriteEventExternalMock.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { POST } = await import("@app/api/favorites/prune/route");
      const response = await POST(
        new Request("http://localhost/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIdsToRemove: ["id-1"] }),
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    });

    it("caps and dedupes event ids at MAX_FAVORITES", async () => {
      const { MAX_FAVORITES } = await import("@utils/constants");
      removeFavoriteEventExternalMock.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const uniqueIds = Array.from(
        { length: MAX_FAVORITES + 5 },
        (_, i) => `id-${i}`
      );
      const idsWithDuplicates = [...uniqueIds, "id-0", "id-1"];

      const { POST } = await import("@app/api/favorites/prune/route");
      const response = await POST(
        new Request("http://localhost/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIdsToRemove: idsWithDuplicates }),
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(removeFavoriteEventExternalMock).toHaveBeenCalledTimes(
        MAX_FAVORITES
      );
    });

    it("does nothing when there are no event ids to remove", async () => {
      const { POST } = await import("@app/api/favorites/prune/route");
      const response = await POST(
        new Request("http://localhost/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIdsToRemove: [] }),
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(removeFavoriteEventExternalMock).not.toHaveBeenCalled();
    });
  });
});
