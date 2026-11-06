import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import { fetchEventBySlug } from "@lib/api/events-external";
import { fetchNewsBySlugExternal } from "@lib/api/news-external";
import { fetchCategoryByIdExternal } from "@lib/api/categories-external";
import { fetchCityByIdExternal } from "@lib/api/cities-external";
import { fetchRegionByIdExternal } from "@lib/api/regions-external";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));

const API = "https://backend.test/api";
const RAW = "../../internal/x?draft=true#frag";
const ENCODED = encodeURIComponent(RAW);

beforeEach(() => {
  vi.mocked(fetchWithHmac).mockReset();
  vi.mocked(fetchWithHmac).mockResolvedValue(new Response(null, { status: 404 }));
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});

function requestedUrl(): URL {
  const [target] = vi.mocked(fetchWithHmac).mock.calls[0] ?? [];
  return new URL(String(target));
}

describe("backend wrappers keep caller input inside one path segment", () => {
  it.each([
    ["fetchEventBySlug", () => fetchEventBySlug(RAW), "/api/events/"],
    ["fetchNewsBySlugExternal", () => fetchNewsBySlugExternal(RAW), "/api/news/"],
    ["fetchCategoryByIdExternal", () => fetchCategoryByIdExternal(RAW), "/api/categories/"],
    ["fetchCityByIdExternal", () => fetchCityByIdExternal(RAW), "/api/places/cities/"],
    ["fetchRegionByIdExternal", () => fetchRegionByIdExternal(RAW), "/api/places/regions/"],
  ])("%s", async (_name, call, prefix) => {
    await call();

    const url = requestedUrl();
    expect(url.origin).toBe("https://backend.test");
    expect(url.pathname).toBe(`${prefix}${ENCODED}`);
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });

  it("leaves a normal slug unchanged", async () => {
    await fetchEventBySlug("concert-de-nadal-2026-abc123");

    expect(requestedUrl().pathname).toBe(
      "/api/events/concert-de-nadal-2026-abc123",
    );
  });
});
