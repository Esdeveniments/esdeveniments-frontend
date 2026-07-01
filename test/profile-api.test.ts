import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildEventsQuery } from "../utils/api-helpers";

const originalEnv = { ...process.env };

describe("lib/api/users-external", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { getUserByUsernameExternal } = await import(
      "../lib/api/users-external"
    );
    const result = await getUserByUsernameExternal("razzmatazz");
    expect(result).toBeNull();
  });
});

describe("buildEventsQuery with profileSlug (legacy filter, no-op on backend)", () => {
  it("includes profileSlug param when set", () => {
    const qs = buildEventsQuery({
      page: 0,
      size: 10,
      profileSlug: "razzmatazz",
    });
    expect(qs.get("profileSlug")).toBe("razzmatazz");
  });

  it("omits profileSlug param when undefined", () => {
    const qs = buildEventsQuery({ page: 0, size: 10 });
    expect(qs.has("profileSlug")).toBe(false);
  });
});
