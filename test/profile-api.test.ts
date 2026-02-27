import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchProfileBySlugExternal } from "../lib/api/profiles-external";
import { buildEventsQuery } from "../utils/api-helpers";

const originalEnv = { ...process.env };

describe("lib/api/profiles-external", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns mock data when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const result = await fetchProfileBySlugExternal("razzmatazz");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("razzmatazz");
    expect(result?.name).toBe("Razzmatazz");
    expect(result?.verified).toBe(true);
  });

  it("returns null for unknown slug when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const result = await fetchProfileBySlugExternal("nonexistent");
    expect(result).toBeNull();
  });
});

describe("buildEventsQuery with profileSlug", () => {
  it("includes profile param when profileSlug is set", () => {
    const qs = buildEventsQuery({
      page: 0,
      size: 10,
      profileSlug: "razzmatazz",
    });
    expect(qs.get("profile")).toBe("razzmatazz");
    expect(qs.has("profileSlug")).toBe(false);
  });

  it("omits profileSlug param when undefined", () => {
    const qs = buildEventsQuery({ page: 0, size: 10 });
    expect(qs.has("profileSlug")).toBe(false);
  });
});
