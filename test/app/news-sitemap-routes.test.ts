import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NewsDetailResponseDTO,
  NewsSummaryResponseDTO,
} from "types/api/news";
import { fetchNews, fetchNewsBySlug } from "@lib/api/news";
import { GET as newsSitemap } from "../../app/server-news-sitemap.xml/route";
import { GET as googleNewsSitemap } from "../../app/server-google-news-sitemap.xml/route";

vi.mock("@lib/api/news", () => ({
  fetchNews: vi.fn(),
  fetchNewsBySlug: vi.fn(),
}));

const article = (slug: string, city: string) =>
  ({ slug, city: { slug: city } }) as NewsSummaryResponseDTO;

const list = (content: NewsSummaryResponseDTO[]) =>
  ({ content }) as Awaited<ReturnType<typeof fetchNews>>;

beforeEach(() => {
  vi.mocked(fetchNews).mockResolvedValue(
    list([article("cap-de-setmana-girona", "girona"), article("setmana-mataro", "mataro")]),
  );
});

describe("server-news-sitemap.xml", () => {
  it("lists every city with news, with no made-up lastmod", async () => {
    const xml = await (await newsSitemap()).text();

    expect(xml).toContain("/noticies/girona</loc>");
    expect(xml).toContain("/noticies/girona/cap-de-setmana-girona</loc>");
    expect(xml).toContain("/noticies/mataro</loc>");
    expect(xml).not.toContain("/noticies/lleida");
    expect(xml).not.toContain("<lastmod>");
  });
});

describe("server-google-news-sitemap.xml", () => {
  it("returns 200 with an empty urlset when nothing is from the last 48 hours", async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue({
      title: "Old",
      createdAt: "2020-01-01T10:00:00Z",
    } as NewsDetailResponseDTO);

    const res = await googleNewsSitemap();
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });

  it("lists recent articles under their own city", async () => {
    vi.mocked(fetchNewsBySlug).mockImplementation(async (slug) =>
      ({
        title: slug,
        createdAt:
          slug === "cap-de-setmana-girona"
            ? new Date().toISOString()
            : "2020-01-01T10:00:00Z",
      }) as NewsDetailResponseDTO,
    );

    const xml = await (await googleNewsSitemap()).text();

    expect(xml).toContain("/noticies/girona/cap-de-setmana-girona</loc>");
    expect(xml).not.toContain("setmana-mataro");
  });
});
