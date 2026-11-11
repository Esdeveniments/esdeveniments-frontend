import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "@lib/api/fetch-wrapper";
import { fetchNewsBySlugExternal, fetchNewsExternal } from "@lib/api/news-external";

vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "http://localhost:8080/api",
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response;
}

// Trimmed from a real GET /news/{slug} payload: events share the event summary shape.
const event = {
  id: "78c1cbb3-bb20-4cf9-94b2-1633bd20ada9",
  hash: "event-hash",
  slug: "concert-ginesta-7-de-novembre-del-2026-78c1cbb3",
  title: 'Concert "Ginestà"',
  isPromoted: false,
  url: "https://empremtes.com/",
  description: "",
  imageUrl: "https://cdn.example.com/foto.jpg",
  startDate: "2026-11-07",
  startTime: "21:00:00",
  endDate: "2026-11-07",
  endTime: "00:00:00",
  location: "Razzmatazz (Sant Martí)",
  city: { id: 48, name: "Barcelona", slug: "barcelona", latitude: 41.39, longitude: 2.15, postalCode: "08001", enabled: true },
  region: null,
  visits: 158,
  origin: "MANUAL",
  categories: [{ id: 14, slug: "musica", name: "Música" }],
};

const detail = {
  id: "news-1",
  type: "WEEKEND",
  title: "Què fer el cap de setmana a Barcelona",
  description: "",
  startDate: "2026-11-07",
  endDate: "2026-11-08",
  readingTime: 13,
  visits: 8,
  createdAt: "2026-11-05T22:44:24.667175",
};

describe("fetchNewsBySlugExternal", () => {
  beforeEach(() => {
    mockFetchWithHmac.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("parses events with the event summary schema and keeps the valid ones", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({ ...detail, events: [event, { id: "broken" }] }),
    );

    const result = await fetchNewsBySlugExternal("slug");

    expect(result?.events).toHaveLength(1);
    expect(result?.events[0].slug).toBe(event.slug);
    expect(result?.events[0].imageUrl).toContain("v=event-hash");
  });

  it("returns no events when the payload has none", async () => {
    mockFetchWithHmac.mockResolvedValue(jsonResponse(detail));

    const result = await fetchNewsBySlugExternal("slug");

    expect(result?.events).toEqual([]);
  });

  it("contracts the place article in the title, description and related news", async () => {
    const masnou = { ...event.city, id: 71, name: "El Masnou", slug: "el-masnou" };
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({
        ...detail,
        title: "Què fer el cap de setmana a El Masnou",
        description: "A El Masnou hi trobaràs teatre.",
        city: masnou,
        relatedNews: [{ ...detail, title: "Plans a El Masnou", city: masnou }],
      }),
    );

    const result = await fetchNewsBySlugExternal("slug");

    expect(result?.title).toBe("Què fer el cap de setmana al Masnou");
    expect(result?.description).toBe("Al Masnou hi trobaràs teatre.");
    expect(result?.relatedNews?.[0].title).toBe("Plans al Masnou");
  });
});

describe("fetchNewsExternal", () => {
  it("contracts the place article in list titles", async () => {
    mockFetchWithHmac.mockResolvedValue(
      jsonResponse({
        content: [
          {
            ...detail,
            title: "Què fer a La Garriga",
            city: { ...event.city, name: "La Garriga", slug: "la-garriga" },
          },
        ],
        last: true,
      }),
    );

    const result = await fetchNewsExternal({});

    expect(result.content[0].title).toBe("Què fer a la Garriga");
  });
});
