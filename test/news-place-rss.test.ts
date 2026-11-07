import { describe, it, expect, vi } from "vitest";
import type { NewsSummaryResponseDTO } from "types/api/news";

const fetchNews = vi.fn();
vi.mock("@lib/api/news", () => ({ fetchNews: (...args: unknown[]) => fetchNews(...args) }));

import { GET } from "../app/[locale]/noticies/[place]/rss.xml/route";

const baseNews: NewsSummaryResponseDTO = {
  id: "n1",
  title: "News",
  startDate: "2026-11-01",
  endDate: "2026-11-02",
  description: "",
  imageUrl: "",
  readingTime: 3,
  visits: 0,
  slug: "news-one",
};

describe("news place RSS", () => {
  it("links each article under its own city, with the feed's place as fallback", async () => {
    fetchNews.mockResolvedValue({
      content: [
        {
          ...baseNews,
          city: { id: 1, name: "Mataró", slug: "mataro" } as NewsSummaryResponseDTO["city"],
          region: { id: 2, name: "Maresme", slug: "maresme" } as NewsSummaryResponseDTO["region"],
        },
        { ...baseNews, id: "n2", slug: "no-place" },
      ],
    });
    const res = await GET(new Request("http://localhost/noticies/maresme/rss.xml"), {
      params: Promise.resolve({ locale: "ca", place: "maresme" }),
    });
    const xml = await res.text();
    expect(xml).toContain("/noticies/mataro/news-one</link>");
    expect(xml).not.toContain("/noticies/maresme/news-one");
    expect(xml).toContain("/noticies/maresme/no-place</link>");
  });
});
