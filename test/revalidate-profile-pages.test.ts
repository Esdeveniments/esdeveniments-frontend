import { describe, it, expect, vi, beforeEach } from "vitest";

const { revalidateTag, after, purge, getMe, captureException } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  after: vi.fn((task: () => unknown) => task()),
  purge: vi.fn(async () => ({ success: true })),
  getMe: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("next/server", () => ({ after }));
vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@lib/cdn/cloudflare-purge", () => ({ purgeProfilePagesFromCdn: purge }));
vi.mock("@lib/api/users-external", () => ({ getAuthenticatedUserExternal: getMe }));

import {
  invalidateProfilePages,
  readCurrentUsername,
} from "@lib/cache/revalidate-profile-pages";

beforeEach(() => vi.clearAllMocks());

describe("invalidateProfilePages", () => {
  it("expires each username once and purges their CDN pages after the response", () => {
    invalidateProfilePages(["alex_old", "alex91", "alex91", undefined, ""]);

    expect(revalidateTag.mock.calls).toEqual([
      ["user:alex_old", { expire: 0 }],
      ["user:alex91", { expire: 0 }],
    ]);
    expect(after).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith(["alex_old", "alex91"]);
  });

  it("does nothing without a username", () => {
    invalidateProfilePages([undefined, null]);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("never fails the save when cache invalidation throws", () => {
    revalidateTag.mockImplementationOnce(() => {
      throw new Error("no request scope");
    });
    expect(() => invalidateProfilePages(["alex91"])).not.toThrow();
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});

describe("readCurrentUsername", () => {
  it("returns the signed-in username", async () => {
    getMe.mockResolvedValue({ username: "alex91" });
    await expect(readCurrentUsername("tok")).resolves.toBe("alex91");
  });

  it("returns undefined when the backend read fails", async () => {
    getMe.mockRejectedValue(Object.assign(new Error("boom"), { status: 503 }));
    await expect(readCurrentUsername("tok")).resolves.toBeUndefined();
  });
});
