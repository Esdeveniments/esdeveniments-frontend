import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { FestaMajorPlacedAct } from "types/festa-major";
import { summarizeTowns } from "@utils/festa-major-calendar";
import { fetchFestaMajorCalendar } from "@lib/api/festes-majors";
import { fetchFestivityPage } from "@lib/api/festivities";
import type { FestivityPageData } from "types/festivity";
import { FESTA_SITEMAP_READ_BUDGET_MS } from "@utils/constants";
import { GET } from "../../app/server-festa-major-sitemap.xml/route";

vi.mock("@config/index", async (importActual) => ({
  ...(await importActual<typeof import("@config/index")>()),
  getSiteUrlFromRequest: () => "https://www.esdeveniments.cat",
}));
vi.mock("@lib/api/festes-majors", () => ({
  fetchFestaMajorCalendar: vi.fn(),
}));
vi.mock("@lib/api/festivities", () => ({ fetchFestivityPage: vi.fn() }));

const festivity = (
  slug: FestivityPageData["slug"],
  indexable: boolean,
  available = true,
) => ({ slug, indexable, available }) as FestivityPageData;

beforeEach(() => {
  vi.mocked(fetchFestivityPage).mockImplementation(async (slug) =>
    festivity(slug, slug === "cavalcades-de-reis"),
  );
});

const act = (town: string, day: number): FestaMajorPlacedAct => {
  const date = `2026-07-${String(day).padStart(2, "0")}`;
  return {
    id: `${town}-${day}`,
    slug: `${town}-${day}`,
    title: `Festa Major: acte ${day}`,
    startDate: date,
    startTime: null,
    endDate: date,
    endTime: null,
    location: "",
    citySlug: town,
    cityName: town,
    regionSlug: "maresme",
    regionName: "Maresme",
  };
};
const request = {} as NextRequest;

describe("server-festa-major-sitemap.xml", () => {
  it("lists the calendar and only the hubs past the indexing gate", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
      summarizeTowns(
        [10, 11, 12, 13, 14]
          .map((day) => act("calella", day))
          .concat(act("tordera", 10)),
        [],
        2026,
        true,
      ),
    );

    const response = await GET(request);
    const xml = await response.text();

    expect(xml).toContain(
      "<loc>https://www.esdeveniments.cat/festes-majors</loc>",
    );
    expect(xml).toContain(
      "<loc>https://www.esdeveniments.cat/festa-major/calella</loc>",
    );
    expect(xml).toContain("/en/festa-major/calella");
    expect(xml).not.toContain("tordera");
    // One indexable town: no region hub.
    expect(xml).not.toContain("/festa-major/maresme");
    // Only the Nadal collections past their gate.
    expect(xml).toContain(
      "<loc>https://www.esdeveniments.cat/cavalcades-de-reis</loc>",
    );
    expect(xml).not.toContain("/fires-de-nadal");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=21600");
  });

  it("does not cache a partial sitemap when a festivity collection failed to load", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
      summarizeTowns(
        [10, 11, 12, 13, 14].map((day) => act("calella", day)),
        [],
        2026,
        true,
      ),
    );
    vi.mocked(fetchFestivityPage).mockImplementation(async (slug) =>
      festivity(slug, false, slug !== "fires-de-nadal"),
    );

    const response = await GET(request);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("/festa-major/calella</loc>");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 503 when an incomplete read leaves only the static calendar path", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
      summarizeTowns([], [], 2026, false),
    );
    vi.mocked(fetchFestivityPage).mockImplementation(async (slug) =>
      festivity(slug, false, true),
    );

    const response = await GET(request);

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Retry-After")).toBe("300");
  });

  it("keeps the calendar when a festivity exceeds the budget, without caching", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
        summarizeTowns(
          [10, 11, 12, 13, 14].map((day) => act("calella", day)),
          [],
          2026,
          true,
        ),
      );
      vi.mocked(fetchFestivityPage).mockImplementation((slug) =>
        slug === "fires-de-nadal"
          ? new Promise(() => {})
          : Promise.resolve(festivity(slug, slug === "cavalcades-de-reis")),
      );

      const pending = GET(request);
      await vi.advanceTimersByTimeAsync(FESTA_SITEMAP_READ_BUDGET_MS);
      const response = await pending;
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(xml).toContain("/festes-majors</loc>");
      expect(xml).toContain("/festa-major/calella</loc>");
      expect(xml).toContain("/cavalcades-de-reis</loc>");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 503 when the calendar exceeds the budget even if festivities resolve", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchFestaMajorCalendar).mockReturnValue(new Promise(() => {}));

      const pending = GET(request);
      await vi.advanceTimersByTimeAsync(FESTA_SITEMAP_READ_BUDGET_MS);
      const response = await pending;

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Retry-After")).toBe("300");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 503 when the calendar backend fails even if festivities resolve", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(null);

    const response = await GET(request);

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Retry-After")).toBe("300");
  });

  it("returns 503 when all reads fail or reject", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockRejectedValue(new Error("boom"));
    vi.mocked(fetchFestivityPage).mockImplementation(async (slug) =>
      festivity(slug, false, false),
    );

    const response = await GET(request);

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Retry-After")).toBe("300");
  });
});
