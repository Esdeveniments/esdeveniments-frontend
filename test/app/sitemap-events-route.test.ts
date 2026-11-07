import { describe, it, expect, vi } from "vitest";
import { XMLParser } from "fast-xml-parser";

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
// Older than EXPIRED_EVENT_NOINDEX_DAYS (60), so it must leave the sitemap.
const longAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

vi.mock("@lib/api/events", () => ({
  fetchEvents: vi.fn().mockResolvedValue({
    content: [
      {
        slug: "upcoming-without-updated-at",
        title: "Upcoming",
        startDate: tomorrow,
        endDate: tomorrow,
      },
      {
        slug: "upcoming-future-updated-at",
        title: "Future edit date",
        startDate: tomorrow,
        endDate: tomorrow,
        updatedAt: `${tomorrow}T10:00:00Z`,
      },
      {
        slug: "upcoming-edited",
        title: "Edited",
        startDate: tomorrow,
        endDate: tomorrow,
        updatedAt: "2026-01-02T10:00:00Z",
      },
      {
        slug: "expired-long-ago",
        title: "Expired",
        startDate: longAgo,
        endDate: longAgo,
      },
    ],
  }),
}));

describe("app/sitemap-events/[...parts]/route", () => {
  it("never emits a future lastmod and only uses real edit dates", async () => {
    const { GET } = await import("../../app/sitemap-events/[...parts]/route");
    const context: RouteContext<"/sitemap-events/[...parts]"> = {
      params: Promise.resolve({ parts: ["1.xml"] }),
    };

    const response = await GET(new Request("https://x/sitemap-events/1.xml"), context);
    const urls = new XMLParser().parse(await response.text()).urlset.url as {
      loc: string;
      lastmod?: string;
    }[];

    const bySlug = Object.fromEntries(
      urls.map((url) => [url.loc.split("/e/")[1], url.lastmod])
    );
    expect(bySlug["upcoming-without-updated-at"]).toBeUndefined();
    expect(bySlug["upcoming-future-updated-at"]).toBeUndefined();
    expect(bySlug["upcoming-edited"]).toBe("2026-01-02T10:00:00.000Z");
    expect(Object.keys(bySlug)).not.toContain("expired-long-ago");
    expect(Object.keys(bySlug)).toHaveLength(3);
  });

  it("lists every locale version as its own <url> with the same alternates", async () => {
    const { GET } = await import("../../app/sitemap-events/[...parts]/route");
    const context: RouteContext<"/sitemap-events/[...parts]"> = {
      params: Promise.resolve({ parts: ["1.xml"] }),
    };

    const response = await GET(new Request("https://x/sitemap-events/1.xml"), context);
    const xml = await response.text();
    const locs = [...xml.matchAll(/<loc>([^<]*upcoming-edited)<\/loc>/g)].map(
      ([, loc]) => new URL(loc).pathname,
    );

    expect(locs).toEqual([
      "/e/upcoming-edited",
      "/es/e/upcoming-edited",
      "/en/e/upcoming-edited",
    ]);
    // ca + es + en + x-default on each of the three entries
    expect(xml.match(/hreflang="es" href="[^"]*\/es\/e\/upcoming-edited"/g)).toHaveLength(3);
  });
});
