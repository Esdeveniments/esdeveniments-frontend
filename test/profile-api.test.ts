import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchProfileBySlugExternal,
  mapUserToProfile,
} from "../lib/api/profiles-external";
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

describe("mapUserToProfile", () => {
  it("maps the lean user DTO to the profile view model", () => {
    const profile = mapUserToProfile({
      id: "u1",
      name: "Sala Apolo",
      username: "sala-apolo",
      pictureUrl: "https://img.example/x.jpg",
      createdAt: "2024-03-01T00:00:00Z",
    });
    expect(profile.slug).toBe("sala-apolo");
    expect(profile.name).toBe("Sala Apolo");
    expect(profile.avatarUrl).toBe("https://img.example/x.jpg");
    expect(profile.joinedDate).toBe("2024-03-01T00:00:00Z");
    expect(profile.verified).toBe(false);
    expect(profile.totalEvents).toBe(0);
  });

  it("defaults a missing picture to null", () => {
    const profile = mapUserToProfile({
      id: "u2",
      name: "X",
      username: "x",
      pictureUrl: null,
      createdAt: "",
    });
    expect(profile.avatarUrl).toBeNull();
  });
});

describe("buildEventsQuery with profileSlug", () => {
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
