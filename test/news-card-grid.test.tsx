import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NewsCardGrid from "@components/noticies/NewsCardGrid";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsCardProps } from "types/props";

// NewsCard is an async server component; stub it to expose the place it gets.
vi.mock("@components/ui/newsCard", () => ({
  default: ({ event, placeSlug, placeLabel }: NewsCardProps) => (
    <a href={`/noticies/${placeSlug}/${event.slug}`}>{placeLabel}</a>
  ),
}));

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

describe("NewsCardGrid", () => {
  it("links each card to the article's own city, not the page's place", () => {
    const html = renderToStaticMarkup(
      <NewsCardGrid
        place="barcelones"
        placeLabel="Barcelonès"
        items={[
          {
            ...baseNews,
            city: { id: 1, name: "Sitges", slug: "sitges" } as NewsSummaryResponseDTO["city"],
          },
        ]}
      />,
    );
    expect(html).toContain('href="/noticies/sitges/news-one"');
    expect(html).toContain(">Sitges<");
  });

  it("falls back to the page's place when the article has no city or region", () => {
    const html = renderToStaticMarkup(
      <NewsCardGrid
        place="barcelones"
        placeLabel="Barcelonès"
        items={[{ ...baseNews, id: "n2", slug: "news-two" }]}
      />,
    );
    expect(html).toContain('href="/noticies/barcelones/news-two"');
    expect(html).toContain(">Barcelonès<");
  });
});
