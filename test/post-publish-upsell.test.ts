import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  savePendingPostPublishUpsell,
  hasPendingPostPublishUpsell,
  clearPendingPostPublishUpsell,
} from "@utils/post-publish-upsell";
import {
  POST_PUBLISH_UPSELL_STORAGE_PREFIX,
  POST_PUBLISH_UPSELL_TTL_MS,
  PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS,
} from "@utils/constants";

describe("post-publish upsell storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves and reads a matching pending upsell for the same slug and owner", () => {
    savePendingPostPublishUpsell("my-event", "owner-1");

    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(true);
    expect(hasPendingPostPublishUpsell("my-event", "other-user")).toBe(false);
    expect(hasPendingPostPublishUpsell("other-event", "owner-1")).toBe(false);
  });

  it("clears the pending upsell explicitly", () => {
    savePendingPostPublishUpsell("my-event", "owner-1");
    clearPendingPostPublishUpsell("my-event");

    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(false);
  });

  it("expires and removes stale entries past TTL", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    savePendingPostPublishUpsell("my-event", "owner-1");

    vi.spyOn(Date, "now").mockReturnValue(now + POST_PUBLISH_UPSELL_TTL_MS);
    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(false);
    expect(
      window.localStorage.getItem(`${POST_PUBLISH_UPSELL_STORAGE_PREFIX}my-event`),
    ).toBeNull();
  });

  it("rejects future-skewed timestamps beyond clock skew", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now + PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS + 10_000);
    savePendingPostPublishUpsell("my-event", "owner-1");

    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(false);
  });

  it("removes corrupt JSON safely", () => {
    window.localStorage.setItem(
      `${POST_PUBLISH_UPSELL_STORAGE_PREFIX}my-event`,
      "{not-json",
    );

    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(false);
    expect(
      window.localStorage.getItem(`${POST_PUBLISH_UPSELL_STORAGE_PREFIX}my-event`),
    ).toBeNull();
  });

  it("does not throw when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => savePendingPostPublishUpsell("my-event", "owner-1")).not.toThrow();
    expect(hasPendingPostPublishUpsell("my-event", "owner-1")).toBe(false);
    expect(() => clearPendingPostPublishUpsell("my-event")).not.toThrow();
  });
});
