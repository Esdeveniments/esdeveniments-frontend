import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { FestaMajorPlacedAct } from "types/festa-major";
import { summarizeTowns } from "@utils/festa-major-calendar";
import { fetchFestaMajorCalendar } from "@lib/api/festes-majors";
import { fetchFestivityPage } from "@lib/api/festivities";
import type { FestivityPageData } from "types/festivity";
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

  it("caches briefly when a Nadal collection failed to load", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
      summarizeTowns([], [], 2026, true),
    );
    vi.mocked(fetchFestivityPage).mockImplementation(async (slug) =>
      festivity(slug, false, slug !== "fires-de-nadal"),
    );

    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("caches briefly when the calendar was cut short", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(
      summarizeTowns([], [], 2026, false),
    );

    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("keeps only the calendar, briefly cached, when the backend fails", async () => {
    vi.mocked(fetchFestaMajorCalendar).mockResolvedValue(null);

    const response = await GET(request);
    const xml = await response.text();

    expect(xml).toContain("/festes-majors</loc>");
    expect(xml).not.toContain("/festa-major/");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});
